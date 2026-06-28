"""
Treina e compara tres modelos de classificacao de risco clinico (Random Forest, XGBoost, Regressao Logistica) usando dados reais extraidos do MIMIC-III Clinical Database Demo.

Tambem compara tres estrategias de balanceamento de classes, ja que o dataset e desbalanceado (a classe HIGH/CRITICAL tem poucos exemplos frente a LOW/MEDIUM):
  - "none": sem balanceamento explicito, so class_weight="balanced" (penaliza mais o erro na classe minoritaria durante o treino).
  - "smote": gera exemplos sinteticos da classe minoritaria por interpolacao entre vizinhos reais (Synthetic Minority Oversampling Technique).
  - "adasyn": como o SMOTE, mas gera mais exemplos sinteticos perto da fronteira de decisao (exemplos minoritarios mais "dificeis").

IMPORTANTE: SMOTE/ADASYN sao aplicados SOMENTE no conjunto de treino, nunca no teste -- aplicar nos dois vazaria informacao sintetica para a avaliacao e infla artificialmente as metricas reportadas.

Uso:
    python train.py --dataset dataset_treino.csv
"""

import argparse
import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split, StratifiedKFold, GridSearchCV
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, classification_report
from sklearn.preprocessing import StandardScaler, LabelEncoder
from xgboost import XGBClassifier
from imblearn.over_sampling import SMOTE, ADASYN


MODELOS_E_GRIDS = {
    "RandomForest": (
        RandomForestClassifier(random_state=42, class_weight="balanced"),
        {
            "n_estimators": [100, 200],
            "max_depth": [8, None],
        },
    ),
    "XGBoost": (
        XGBClassifier(random_state=42, eval_metric="mlogloss"),
        {
            "n_estimators": [100, 200],
            "max_depth": [3, 6],
            "learning_rate": [0.1, 0.3],
        },
    ),
    "LogisticRegression": (
        LogisticRegression(max_iter=2000, class_weight="balanced"),
        {
            "C": [0.1, 1.0, 10.0],
        },
    ),
}


def carregar_dados(caminho_csv: str):
    df = pd.read_csv(caminho_csv)
    X = df[["spo2", "fc", "temp"]]
    y = df["risco"]
    return X, y


def balancear_treino(X_train, y_train, estrategia: str):
    """
        Aplica a estrategia de balanceamento escolhida SOMENTE no treino.

        "none": retorna os dados originais, sem alteracao (o balanceamento nesse caso fica a cargo do class_weight="balanced" dentro do proprio modelo, ja configurado em MODELOS_E_GRIDS).
        "smote": gera exemplos sinteticos das classes minoritarias por interpolacao entre k vizinhos mais proximos reais.
        "adasyn": como o SMOTE, mas concentra a geracao de exemplos sinteticos perto da fronteira de decisao.
    """
    if estrategia == "none":
        return X_train, y_train

    contagem_minima = y_train.value_counts().min()
    k_neighbors = max(1, min(5, contagem_minima - 1))

    if estrategia == "smote":
        balanceador = SMOTE(random_state=42, k_neighbors=k_neighbors)
    elif estrategia == "adasyn":
        balanceador = ADASYN(random_state=42, n_neighbors=k_neighbors)
    else:
        raise ValueError(f"Estrategia de balanceamento desconhecida: {estrategia}")

    X_bal, y_bal = balanceador.fit_resample(X_train, y_train)
    return X_bal, y_bal


def treinar_e_avaliar(nome: str, modelo_base, grid: dict, X_train, X_test, y_train, y_test, usa_scaler: bool, usa_label_encoder: bool, estrategia_balanceamento: str, label_encoder=None, cv_splits: int = 3):
    """
        Faz tuning de hiperparametros via GridSearchCV com validacao cruzada estratificada sobre o conjunto de treino, depois avalia o melhor modelo encontrado no conjunto de teste.
    """
    if usa_scaler:
        scaler = StandardScaler()
        X_train_proc = pd.DataFrame(scaler.fit_transform(X_train), columns=["spo2", "fc", "temp"])
        X_test_proc = pd.DataFrame(scaler.transform(X_test), columns=["spo2", "fc", "temp"])
    else:
        scaler = None
        X_train_proc = X_train
        X_test_proc = X_test

    if usa_label_encoder:
        y_train_proc = label_encoder.transform(y_train)
    else:
        y_train_proc = y_train

    X_train_bal, y_train_bal = balancear_treino(
        pd.DataFrame(X_train_proc, columns=["spo2", "fc", "temp"]) if not hasattr(X_train_proc, "columns") else X_train_proc,
        pd.Series(y_train_proc).reset_index(drop=True),
        estrategia_balanceamento,
    )

    cv = StratifiedKFold(n_splits=cv_splits, shuffle=True, random_state=42)
    busca = GridSearchCV(
        modelo_base, grid, scoring="f1_macro", cv=cv, n_jobs=-1
    )
    busca.fit(X_train_bal, y_train_bal)
    modelo = busca.best_estimator_

    print(f"\n--- {nome} | balanceamento={estrategia_balanceamento} ---")
    print(f"Melhores hiperparametros (via GridSearchCV, {cv_splits}-fold): {busca.best_params_}")
    print(f"F1 macro medio na validacao cruzada (treino): {busca.best_score_:.3f}")

    y_pred_raw = modelo.predict(X_test_proc)
    y_pred = label_encoder.inverse_transform(y_pred_raw) if usa_label_encoder else y_pred_raw

    metricas = {
        "modelo": nome,
        "balanceamento": estrategia_balanceamento,
        "f1_macro_cv_treino": busca.best_score_,
        "acuracia": accuracy_score(y_test, y_pred),
        "precisao_macro": precision_score(y_test, y_pred, average="macro", zero_division=0),
        "recall_macro": recall_score(y_test, y_pred, average="macro", zero_division=0),
        "f1_macro": f1_score(y_test, y_pred, average="macro", zero_division=0),
    }

    print("Desempenho no conjunto de teste (holdout):")
    print(classification_report(y_test, y_pred, zero_division=0))

    return metricas, modelo, scaler


def main():
    parser = argparse.ArgumentParser(description="Treina e compara modelos de risco clinico.")
    parser.add_argument("--dataset", default="dataset_treino.csv", help="CSV gerado por prepare_data.py")
    parser.add_argument("--out-model", default="model.pkl", help="Caminho do modelo final (melhor dos 3) a ser salvo")
    parser.add_argument("--out-metrics", default="metricas_comparativo.csv", help="CSV com a tabela comparativa de metricas")
    args = parser.parse_args()

    print(f"Carregando dataset: {args.dataset}")
    X, y = carregar_dados(args.dataset)
    print(f"Total de amostras: {len(X)}")
    print("Distribuicao de classes:")
    print(y.value_counts())

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    resultados = []
    modelos_treinados = {}

    label_encoder = LabelEncoder()
    label_encoder.fit(y_train)

    estrategias_balanceamento = ["none", "smote", "adasyn"]

    for estrategia in estrategias_balanceamento:
        for nome, (modelo_base, grid) in MODELOS_E_GRIDS.items():
            usa_scaler = nome == "LogisticRegression"
            usa_label_encoder = nome == "XGBoost"
            metricas, modelo_treinado, scaler = treinar_e_avaliar(
                nome, modelo_base, grid, X_train, X_test, y_train, y_test,
                usa_scaler, usa_label_encoder, estrategia, label_encoder
            )
            resultados.append(metricas)
            chave = f"{nome}__{estrategia}"
            modelos_treinados[chave] = (modelo_treinado, scaler, nome)

    tabela_resultados = pd.DataFrame(resultados).sort_values("f1_macro_cv_treino", ascending=False)
    print("\n=== Tabela comparativa final ===")
    print(tabela_resultados.to_string(index=False))

    tabela_resultados.to_csv(args.out_metrics, index=False)
    print(f"\nTabela de metricas salva em: {args.out_metrics}")

    melhor_linha = tabela_resultados.iloc[0]
    melhor_nome = melhor_linha["modelo"]
    melhor_estrategia = melhor_linha["balanceamento"]
    chave_melhor = f"{melhor_nome}__{melhor_estrategia}"
    melhor_modelo, melhor_scaler, _ = modelos_treinados[chave_melhor]

    print(f"\nMelhor combinacao: {melhor_nome} + balanceamento={melhor_estrategia} -> salvando como {args.out_model}")
    precisa_label_encoder = melhor_nome == "XGBoost"
    joblib.dump(
        {
            "modelo": melhor_modelo,
            "scaler": melhor_scaler,
            "label_encoder": label_encoder if precisa_label_encoder else None,
            "nome": melhor_nome,
            "balanceamento": melhor_estrategia,
        },
        args.out_model,
    )
    print("Treinamento concluido.")


if __name__ == "__main__":
    main()