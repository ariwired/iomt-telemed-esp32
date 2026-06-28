"""
Avaliacao mais rigorosa dos 3 modelos x 3 estrategias de balanceamento, esse script realiza:
1. Tabela comparativa com media +/- desvio padrao via validacao cruzada aninhada repetida, agrupada por paciente (icustay_id).
2. Tabela em formato Markdown.
3. Matriz de confusao do modelo vencedor.
4. Curva ROC multiclasse (one-vs-rest) do modelo vencedor.
5. Grafico de importancia de features do modelo vencedor.

Este script usa validacao cruzada aninhada repetida (outer loop avalia, inner loop ajusta hiperparametros) sobre todo o dataset, o que:
- Usa todos os 904 exemplos para avaliar (nao so 181 do holdout).
- Cada amostra aparece no conjunto de teste em algum momento, varias vezes, entao o resultado final é uma MEDIA de varias divisoes diferentes, nao depende de uma unica divisao "sortuda" ou "azarada".
- Reporta desvio padrao, podendo usar "F1 macro = 0.93 +/- 0.04" em vez de um numero unico sem contexto de incerteza.

NOTA: O rotulo "risco" é uma funcao DETERMINISTICA das 3 features usadas como entrada do modelo. Não é evidencia de que o modelo capture risco clinico real, e sim de que ele reconstroi bem o NEWS2 simplificado a partir de sinais possivelmente ruidosos.

Uso:
    python gerar_relatorio_artigo.py --dataset dataset_treino.csv
"""

import argparse
import warnings
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedGroupKFold, GridSearchCV, cross_val_predict
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, roc_curve, auc

from sklearn.preprocessing import StandardScaler, LabelEncoder, label_binarize
from xgboost import XGBClassifier
from imblearn.over_sampling import SMOTE, ADASYN
from imblearn.pipeline import Pipeline as ImbPipeline

warnings.filterwarnings("ignore", category=UserWarning)

FEATURES = ["spo2", "fc", "temp"]

MODELOS_E_GRIDS = {
    "RandomForest": (
        RandomForestClassifier(random_state=42, class_weight="balanced"),
        {"clf__n_estimators": [100, 200], "clf__max_depth": [8, None]},
    ),
    "XGBoost": (
        XGBClassifier(random_state=42, eval_metric="mlogloss"),
        {"clf__n_estimators": [100, 200], "clf__max_depth": [3, 6], "clf__learning_rate": [0.1, 0.3]},
    ),
    "LogisticRegression": (
        LogisticRegression(max_iter=2000, class_weight="balanced"),
        {"clf__C": [0.1, 1.0, 10.0]},
    ),
}

ESTRATEGIAS_BALANCEAMENTO = ["none", "smote", "adasyn"]


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


def k_neighbors_seguro(y_encoded, maximo=3) -> int:
    contagem_minima = pd.Series(y_encoded).value_counts().min()
    return max(1, min(maximo, contagem_minima - 1))


def montar_pipeline(modelo_base, estrategia: str, usa_scaler: bool, k_neighbors: int) -> ImbPipeline:
    """
        Pipeline imblearn (scaler opcional + balanceamento opcional + classificador), para que SMOTE/ADASYN sejam aplicados corretamente DENTRO de cada fold da validacao cruzada, nunca antes do split, e nunca no fold de teste/validacao. Isso evita vazamento de dados sinteticos entre treino e teste em QUALQUER fold.
    """
    etapas = []
    if usa_scaler:
        etapas.append(("scaler", StandardScaler()))
    if estrategia == "smote":
        etapas.append(("balanceamento", SMOTE(random_state=42, k_neighbors=k_neighbors)))
    elif estrategia == "adasyn":
        etapas.append(("balanceamento", ADASYN(random_state=42, n_neighbors=k_neighbors)))
    etapas.append(("clf", modelo_base))
    return ImbPipeline(etapas)


def avaliar_combo_grouped_cv(nome_modelo, modelo_base, grid, estrategia, X, y_encoded, grupos, n_splits=5, n_repeats=5, inner_splits=3):
    """
        Validacao cruzada aninhada, agrupada por paciente, repetida:
        - outer: StratifiedGroupKFold, repetido n_repeats vezes com seeds diferentes (cada paciente fica inteiro de um lado do split -- treino OU teste, nunca os dois).
        - inner: GridSearchCV com StratifiedGroupKFold dentro de cada fold de treino do outer, para ajustar hiperparametros sem usar o fold de teste daquela iteracao.

        Retorna a lista de metricas de cada iteracao outer (n_splits x n_repeats no maximo), para depois calcular media e desvio padrao.
    """
    usa_scaler = nome_modelo == "LogisticRegression"
    k_neighbors = k_neighbors_seguro(y_encoded)
    pipeline = montar_pipeline(modelo_base, estrategia, usa_scaler, k_neighbors)

    resultados_fold = []

    for repeticao in range(n_repeats):
        outer_cv = StratifiedGroupKFold(n_splits=n_splits, shuffle=True, random_state=42 + repeticao)

        for idx_train, idx_test in outer_cv.split(X, y_encoded, groups=grupos):
            X_train, X_test = X.iloc[idx_train], X.iloc[idx_test]
            y_train, y_test = y_encoded[idx_train], y_encoded[idx_test]
            grupos_train = grupos.iloc[idx_train]

            n_grupos_treino = grupos_train.nunique()
            splits_inner = min(inner_splits, n_grupos_treino)
            if splits_inner < 2:
                continue

            inner_cv = StratifiedGroupKFold(n_splits=splits_inner, shuffle=True, random_state=42)
            busca = GridSearchCV(pipeline, grid, scoring="f1_macro", cv=inner_cv, n_jobs=-1)
            busca.fit(X_train, y_train, groups=grupos_train)
            y_pred = busca.predict(X_test)

            resultados_fold.append({
                "acuracia": accuracy_score(y_test, y_pred),
                "precisao_macro": precision_score(y_test, y_pred, average="macro", zero_division=0),
                "recall_macro": recall_score(y_test, y_pred, average="macro", zero_division=0),
                "f1_macro": f1_score(y_test, y_pred, average="macro", zero_division=0),
            })

    return resultados_fold


def resumir_resultados(nome_modelo, estrategia, resultados_fold):
    df = pd.DataFrame(resultados_fold)
    resumo = {"modelo": nome_modelo, "balanceamento": estrategia, "n_avaliacoes": len(df)}
    for col in ["acuracia", "precisao_macro", "recall_macro", "f1_macro"]:
        resumo[f"{col}_media"] = df[col].mean()
        resumo[f"{col}_std"] = df[col].std()
    return resumo


def gerar_tabela_markdown(tabela: pd.DataFrame, caminho_saida: str):
    """Gera uma tabela Markdown, no formato 'media +/- std'."""
    linhas = ["| Modelo | Balanceamento | Acurácia | Precisão (macro) | Recall (macro) | F1 (macro) |",
              "|---|---|---|---|---|---|"]
    for _, row in tabela.iterrows():
        linhas.append(
            f"| {row['modelo']} | {row['balanceamento']} "
            f"| {row['acuracia_media']:.3f} ± {row['acuracia_std']:.3f} "
            f"| {row['precisao_macro_media']:.3f} ± {row['precisao_macro_std']:.3f} "
            f"| {row['recall_macro_media']:.3f} ± {row['recall_macro_std']:.3f} "
            f"| {row['f1_macro_media']:.3f} ± {row['f1_macro_std']:.3f} |"
        )
    conteudo = "\n".join(linhas)
    with open(caminho_saida, "w") as f:
        f.write(conteudo + "\n")
    return conteudo


def gerar_figuras_modelo_vencedor(nome_modelo, modelo_base, grid, estrategia, X, y_encoded, grupos, label_encoder, prefixo_saida):
    """
    Treina o modelo vencedor com tuning de hiperparametros (CV agrupada por paciente) e gera, usando cross_val_predict (previsoes obtidas fora-da-amostra, fold a fold, respeitando os grupos):
    - matriz de confusao
    - curva ROC multiclasse (one-vs-rest)
    - importancia de features
    """
    usa_scaler = nome_modelo == "LogisticRegression"
    k_neighbors = k_neighbors_seguro(y_encoded)
    pipeline = montar_pipeline(modelo_base, estrategia, usa_scaler, k_neighbors)

    n_splits = min(5, grupos.nunique())
    cv = StratifiedGroupKFold(n_splits=n_splits, shuffle=True, random_state=42)

    busca = GridSearchCV(pipeline, grid, scoring="f1_macro", cv=cv, n_jobs=-1)
    busca.fit(X, y_encoded, groups=grupos)
    melhor_pipeline = busca.best_estimator_

    y_pred = cross_val_predict(melhor_pipeline, X, y_encoded, groups=grupos, cv=cv, n_jobs=-1)
    y_proba = cross_val_predict(melhor_pipeline, X, y_encoded, groups=grupos, cv=cv, method="predict_proba", n_jobs=-1)

    classes = label_encoder.classes_

    cm = confusion_matrix(y_encoded, y_pred)
    fig, ax = plt.subplots(figsize=(5, 4.5))
    im = ax.imshow(cm, cmap="Blues")
    ax.set_xticks(range(len(classes)))
    ax.set_yticks(range(len(classes)))
    ax.set_xticklabels(classes)
    ax.set_yticklabels(classes)
    ax.set_xlabel("Predito")
    ax.set_ylabel("Real")
    ax.set_title(f"Matriz de confusão — {nome_modelo} + {estrategia}\n(previsões fora-da-amostra, {n_splits}-fold agrupado por paciente)")

    for i in range(len(classes)):
        for j in range(len(classes)):
            ax.text(j, i, str(cm[i, j]), ha="center", va="center", color="white" if cm[i, j] > cm.max() / 2 else "black")

    fig.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
    fig.tight_layout()
    fig.savefig(f"{prefixo_saida}_matriz_confusao.png", dpi=150)
    plt.close(fig)

    y_bin = label_binarize(y_encoded, classes=range(len(classes)))
    fig, ax = plt.subplots(figsize=(5.5, 4.5))

    for i, classe in enumerate(classes):
        fpr, tpr, _ = roc_curve(y_bin[:, i], y_proba[:, i])
        roc_auc = auc(fpr, tpr)
        ax.plot(fpr, tpr, label=f"{classe} (AUC={roc_auc:.2f})")

    ax.plot([0, 1], [0, 1], linestyle="--", color="gray", linewidth=1)
    ax.set_xlabel("Taxa de falsos positivos")
    ax.set_ylabel("Taxa de verdadeiros positivos")
    ax.set_title(f"Curva ROC (one-vs-rest) — {nome_modelo} + {estrategia}")
    ax.legend(loc="lower right", fontsize=9)
    fig.tight_layout()
    fig.savefig(f"{prefixo_saida}_curva_roc.png", dpi=150)
    plt.close(fig)

    clf_final = melhor_pipeline.named_steps["clf"]
    if hasattr(clf_final, "feature_importances_"):
        importancias = clf_final.feature_importances_
        fig, ax = plt.subplots(figsize=(5, 3.5))
        ordem = np.argsort(importancias)
        ax.barh(np.array(X.columns)[ordem], importancias[ordem], color="#2e6e62")
        ax.set_xlabel("Importância")
        ax.set_title(f"Importância de features — {nome_modelo}")
        fig.tight_layout()
        fig.savefig(f"{prefixo_saida}_feature_importance.png", dpi=150)
        plt.close(fig)

    return busca.best_params_


def main():
    parser = argparse.ArgumentParser(description="Gera relatorio.")
    parser.add_argument("--dataset", default="dataset_treino.csv")
    parser.add_argument("--n-repeats", type=int, default=5, help="Repeticoes do outer K-Fold (padrao: 5)")
    parser.add_argument("--out-prefix", default="relatorio")
    args = parser.parse_args()

    X, y, grupos = carregar_dados(args.dataset)

    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(y)

    print(f"Dataset: {len(X)} amostras | {grupos.nunique()} pacientes (grupos) unicos. Classes: {dict(y.value_counts())}")
    print(
        f"Avaliando 9 combinacoes via CV aninhada agrupada por paciente, repetida "
        f"(5-fold outer x {args.n_repeats} repeticoes)...\n"
    )

    resumos = []

    for estrategia in ESTRATEGIAS_BALANCEAMENTO:
        for nome_modelo, (modelo_base, grid) in MODELOS_E_GRIDS.items():
            print(f"  -> {nome_modelo} + {estrategia} ...")
            resultados_fold = avaliar_combo_grouped_cv(
                nome_modelo, modelo_base, grid, estrategia, X, y_encoded, grupos,
                n_repeats=args.n_repeats,
            )
            resumos.append(resumir_resultados(nome_modelo, estrategia, resultados_fold))

    tabela = pd.DataFrame(resumos).sort_values("f1_macro_media", ascending=False).reset_index(drop=True)

    print("\n=== Tabela final (CV aninhada agrupada por paciente, média ± desvio padrão) ===")
    print(tabela[["modelo", "balanceamento", "n_avaliacoes", "acuracia_media", "f1_macro_media", "f1_macro_std"]].to_string(index=False))

    tabela.to_csv(f"{args.out_prefix}_tabela_completa.csv", index=False)
    markdown = gerar_tabela_markdown(tabela, f"{args.out_prefix}_tabela.md")
    print(f"\nTabela Markdown salva em {args.out_prefix}_tabela.md:\n")
    print(markdown)

    melhor = tabela.iloc[0]
    melhor_nome = melhor["modelo"]
    melhor_estrategia = melhor["balanceamento"]
    print(f"\nMelhor combinação (por F1 macro médio em CV agrupada por paciente): {melhor_nome} + {melhor_estrategia}")
    print(
        "\nPara exportar EXATAMENTE este modelo para producao rode:\n"
        f"  python train.py --dataset {args.dataset} --modelo {melhor_nome} --balanceamento {melhor_estrategia}"
    )

    print("\nGerando figuras do modelo vencedor...")
    modelo_base, grid = MODELOS_E_GRIDS[melhor_nome]
    melhores_params = gerar_figuras_modelo_vencedor(
        melhor_nome, modelo_base, grid, melhor_estrategia, X, y_encoded, grupos, label_encoder, args.out_prefix
    )
    print(f"Hiperparâmetros do modelo vencedor: {melhores_params}")
    print(f"Figuras salvas: {args.out_prefix}_matriz_confusao.png, {args.out_prefix}_curva_roc.png, "
          f"{args.out_prefix}_feature_importance.png (se aplicável)")


if __name__ == "__main__":
    main()