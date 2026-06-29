"""
Treina e compara tres modelos de classificacao de risco clinico (Random Forest, XGBoost, Regressao Logistica) usando dados reais extraidos do MIMIC-III Clinical Database Demo.

Tambem compara tres estrategias de balanceamento de classes, ja que o dataset e desbalanceado (a classe HIGH/CRITICAL tem poucos exemplos frente a LOW/MEDIUM):
  - "none": sem balanceamento explicito, so class_weight="balanced" (penaliza mais o erro na classe minoritaria durante o treino).
  - "smote": gera exemplos sinteticos da classe minoritaria por interpolacao entre vizinhos reais (Synthetic Minority Oversampling Technique).
  - "adasyn": como o SMOTE, mas gera mais exemplos sinteticos perto da fronteira de decisao (exemplos minoritarios mais "dificeis").

IMPORTANTE: SMOTE/ADASYN sao aplicados SOMENTE no conjunto de treino, nunca no teste -- aplicar nos dois vazaria informacao sintetica para a avaliacao e infla artificialmente as metricas reportadas.

Uso:
    python train.py --dataset dataset_treino.csv
    python train.py --dataset dataset_treino.csv --modelo RandomForest --balanceamento none
"""

import argparse
import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GroupShuffleSplit, StratifiedGroupKFold, GridSearchCV
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, classification_report
from sklearn.preprocessing import StandardScaler, LabelEncoder
from xgboost import XGBClassifier
from imblearn.over_sampling import SMOTE, ADASYN
from imblearn.pipeline import Pipeline as ImbPipeline

FEATURES = ["spo2", "fc", "temp"]

MODELOS_E_GRIDS = {
    "RandomForest": (
        RandomForestClassifier(random_state=42, class_weight="balanced"),
        {
            "clf__n_estimators": [100, 200],
            "clf__max_depth": [8, None],
        },
    ),
    "XGBoost": (
        XGBClassifier(random_state=42, eval_metric="mlogloss"),
        {
            "clf__n_estimators": [100, 200],
            "clf__max_depth": [3, 6],
            "clf__learning_rate": [0.1, 0.3],
        },
    ),
    "LogisticRegression": (
        LogisticRegression(max_iter=2000, class_weight="balanced"),
        {
            "clf__C": [0.1, 1.0, 10.0],
        },
    ),
}



def carregar_dados(caminho_csv: str):
    df = pd.read_csv(caminho_csv)

    faltando = {"spo2", "fc", "temp", "risco"} - set(df.columns)
    if faltando:
        raise ValueError(f"Coluna(s) obrigatoria(s) faltando no dataset: {faltando}")

    if "icustay_id" not in df.columns:
        grupos = pd.Series(range(len(df)))
    else:
        grupos = df["icustay_id"]

    X = df[FEATURES]
    y = df["risco"]
    return X, y, grupos


def k_neighbors_seguro(y_encoded, maximo=5) -> int:
    """
        k_neighbors do SMOTE/ADASYN nao pode ser >= numero de exemplos da classe minoritaria.
    """
    contagem_minima = pd.Series(y_encoded).value_counts().min()
    return max(1, min(maximo, contagem_minima - 1))

def montar_pipeline(modelo_base, estrategia: str, usa_scaler: bool, k_neighbors: int) -> ImbPipeline:
    """
        Pipeline imblearn (scaler opcional + balanceamento opcional + classificador).
    """
    etapas = []
    if usa_scaler:
        etapas.append(("scaler", StandardScaler()))
    if estrategia == "smote":
        etapas.append(("balanceamento", SMOTE(random_state=42, k_neighbors=k_neighbors)))
    elif estrategia == "adasyn":
        etapas.append(("balanceamento", ADASYN(random_state=42, n_neighbors=k_neighbors)))
    elif estrategia != "none":
        raise ValueError(f"Estrategia de balanceamento desconhecida: {estrategia}")
    etapas.append(("clf", modelo_base))
    return ImbPipeline(etapas)

# def balancear_treino(X_train, y_train, estrategia: str):
#     """
#         Aplica a estrategia de balanceamento escolhida SOMENTE no treino.

#         "none": retorna os dados originais, sem alteracao (o balanceamento nesse caso fica a cargo do class_weight="balanced" dentro do proprio modelo, ja configurado em MODELOS_E_GRIDS).
#         "smote": gera exemplos sinteticos das classes minoritarias por interpolacao entre k vizinhos mais proximos reais.
#         "adasyn": como o SMOTE, mas concentra a geracao de exemplos sinteticos perto da fronteira de decisao.
#     """
#     if estrategia == "none":
#         return X_train, y_train

#     contagem_minima = y_train.value_counts().min()
#     k_neighbors = max(1, min(5, contagem_minima - 1))

#     if estrategia == "smote":
#         balanceador = SMOTE(random_state=42, k_neighbors=k_neighbors)
#     elif estrategia == "adasyn":
#         balanceador = ADASYN(random_state=42, n_neighbors=k_neighbors)
#     else:
#         raise ValueError(f"Estrategia de balanceamento desconhecida: {estrategia}")

#     X_bal, y_bal = balanceador.fit_resample(X_train, y_train)
#     return X_bal, y_bal


def treinar_e_avaliar(nome, modelo_base, grid, estrategia, X_train, X_test, y_train, y_test, grupos_train, label_encoder, cv_splits=3):
    """
        Faz tuning de hiperparametros via GridSearchCV com validacao cruzada estratificada E AGRUPADA POR PACIENTE sobre o conjunto de treino, depois avalia o melhor modelo encontrado no conjunto de teste (pacientes nunca vistos durante o treino/tuning).
    """
    usa_scaler = nome == "LogisticRegression"
    y_train_enc = label_encoder.transform(y_train)
    y_test_enc = label_encoder.transform(y_test)

    k_neighbors = k_neighbors_seguro(y_train_enc)
    pipeline = montar_pipeline(modelo_base, estrategia, usa_scaler, k_neighbors)

    n_grupos_treino = grupos_train.nunique()
    splits_possiveis = min(cv_splits, n_grupos_treino)
    if splits_possiveis < 2:
        raise ValueError(
            f"Apenas {n_grupos_treino} paciente(s) no treino -- "
            "impossivel fazer validacao cruzada agrupada."
        )
    cv = StratifiedGroupKFold(n_splits=splits_possiveis, shuffle=True, random_state=42)

    busca = GridSearchCV(pipeline, grid, scoring="f1_macro", cv=cv, n_jobs=-1)
    busca.fit(X_train, y_train_enc, groups=grupos_train)
    modelo = busca.best_estimator_

    print(f"\n--- {nome} | balanceamento={estrategia} ---")
    print(
        f"Melhores hiperparametros (GridSearchCV, {splits_possiveis}-fold agrupado "
        f"por paciente): {busca.best_params_}"
    )
    print(f"F1 macro medio na CV agrupada (treino): {busca.best_score_:.3f}")

    y_pred_enc = modelo.predict(X_test)
    y_pred = label_encoder.inverse_transform(y_pred_enc)

    metricas = {
        "modelo": nome,
        "balanceamento": estrategia,
        "f1_macro_cv_treino": busca.best_score_,
        "acuracia_teste": accuracy_score(y_test, y_pred),
        "precisao_macro_teste": precision_score(y_test, y_pred, average="macro", zero_division=0),
        "recall_macro_teste": recall_score(y_test, y_pred, average="macro", zero_division=0),
        "f1_macro_teste": f1_score(y_test, y_pred, average="macro", zero_division=0),
    }

    print("Desempenho no conjunto de teste (holdout, pacientes nunca vistos no treino):")
    print(classification_report(y_test, y_pred, zero_division=0))

    return metricas, modelo

def main():
    parser = argparse.ArgumentParser(description="Treina e compara modelos de risco clinico.")
    parser.add_argument("--dataset", default="dataset_treino.csv", help="CSV gerado por prepare_data.py")
    parser.add_argument("--out-model", default="model.pkl", help="Caminho do modelo final a ser salvo")
    parser.add_argument("--out-metrics", default="metricas_comparativo.csv", help="CSV com a tabela comparativa")
    parser.add_argument("--test-size", type=float, default=0.2, help="Fracao de PACIENTES reservada para teste")
    parser.add_argument("--cv-splits", type=int, default=3, help="Numero de folds da CV interna (GridSearchCV)")
    parser.add_argument(
        "--modelo", choices=list(MODELOS_E_GRIDS.keys()), default=None,
        help=(
            "Se informado (junto com --balanceamento), PULA a comparacao completa "
            "e treina/exporta diretamente essa combinacao. Use o valor impresso por "
            "gerar_relatorio.py como 'melhor combinacao' para garantir que o modelo "
            "exportado para producao seja o mesmo identificado como melhor no "
            "relatorio do artigo."
        ),
    )
    parser.add_argument("--balanceamento", choices=["none", "smote", "adasyn"], default=None)
    args = parser.parse_args()

    if (args.modelo is None) != (args.balanceamento is None):
        parser.error("--modelo e --balanceamento devem ser usados juntos (ou nenhum dos dois).")

    print(f"Carregando dataset: {args.dataset}")
    X, y, grupos = carregar_dados(args.dataset)
    print(f"Total de amostras: {len(X)} | Pacientes (grupos) unicos: {grupos.nunique()}")
    print("Distribuicao de classes:")
    print(y.value_counts())

    splitter = GroupShuffleSplit(n_splits=1, test_size=args.test_size, random_state=42)
    idx_train, idx_test = next(splitter.split(X, y, groups=grupos))
    X_train, X_test = X.iloc[idx_train], X.iloc[idx_test]
    y_train, y_test = y.iloc[idx_train], y.iloc[idx_test]
    grupos_train = grupos.iloc[idx_train]
    grupos_test = grupos.iloc[idx_test]

    sobreposicao = set(grupos_train) & set(grupos_test)
    assert not sobreposicao, f"Vazamento de paciente entre treino e teste! Grupos em comum: {sobreposicao}"
    print(
        f"Split treino/teste agrupado por paciente: {len(X_train)} linhas / "
        f"{grupos_train.nunique()} pacientes no treino, {len(X_test)} linhas / "
        f"{grupos_test.nunique()} pacientes no teste. Nenhum paciente em comum (verificado)."
    )

    label_encoder = LabelEncoder()
    label_encoder.fit(y)

    if args.modelo is not None:
        modelo_base, grid = MODELOS_E_GRIDS[args.modelo]
        metricas, modelo_treinado = treinar_e_avaliar(
            args.modelo, modelo_base, grid, args.balanceamento,
            X_train, X_test, y_train, y_test, grupos_train, label_encoder, args.cv_splits,
        )
        pd.DataFrame([metricas]).to_csv(args.out_metrics, index=False)
        melhor_nome, melhor_estrategia, melhor_modelo = args.modelo, args.balanceamento, modelo_treinado

    else:
        resultados = []
        modelos_treinados = {}
        for estrategia in ["none", "smote", "adasyn"]:
            for nome, (modelo_base, grid) in MODELOS_E_GRIDS.items():
                metricas, modelo_treinado = treinar_e_avaliar(
                    nome, modelo_base, grid, estrategia,
                    X_train, X_test, y_train, y_test, grupos_train, label_encoder, args.cv_splits,
                )
                resultados.append(metricas)
                modelos_treinados[f"{nome}__{estrategia}"] = modelo_treinado

        tabela_resultados = pd.DataFrame(resultados).sort_values("f1_macro_teste", ascending=False)
        print("\n=== Tabela comparativa final (ordenada por F1 macro NO HOLDOUT DE TESTE) ===")
        print(tabela_resultados.to_string(index=False))
        tabela_resultados.to_csv(args.out_metrics, index=False)
        print(f"\nTabela de metricas salva em: {args.out_metrics}")

        melhor_linha = tabela_resultados.iloc[0]
        melhor_nome = melhor_linha["modelo"]
        melhor_estrategia = melhor_linha["balanceamento"]
        melhor_modelo = modelos_treinados[f"{melhor_nome}__{melhor_estrategia}"]

        print(
            f"\nMelhor combinacao por F1 macro no HOLDOUT DE TESTE: {melhor_nome} + "
            f"balanceamento={melhor_estrategia}.\n"
        )

    print(f"\nSalvando modelo final ({melhor_nome} + {melhor_estrategia}) em: {args.out_model}")
    joblib.dump(
        {
            "modelo": melhor_modelo,
            "label_encoder": label_encoder,
            "nome": melhor_nome,
            "balanceamento": melhor_estrategia,
            "features": FEATURES,
        },
        args.out_model,
    )
    print("Treinamento concluido.")


if __name__ == "__main__":
    main()