"""
Extrai sinais vitais (Frequencia Cardiaca, SpO2, Temperatura) do MIMIC-III Clinical Database Demo na tabela CHARTEVENTS.csv e gera um dataset tabular pronto para treinamento, no MESMO formato de features usado pelo sistema.

(spo2, fc, temp -> risco)

Este script:
- Filtra CHARTEVENTS.csv pelos itemids de FC, SpO2 e Temperatura (cobrindo os dois sistemas de origem).
- Agrupa as leituras por icustay_id + hora (arredondada), simulando uma "leitura simultanea" dos 3 sinais, como um sensor real geraria.
- Calcula o rotulo de risco a partir de um escore clinico padronizado (NEWS2 simplificado, ver calcular_risco_news2()), em vez de uma formula sintetica arbitraria.

Uso:
    python prepare_data.py --mimic-dir /caminho/para/mimic-iii-clinical-database-demo-1.4 --out dataset_treino.csv
"""

import argparse
import pandas as pd
import numpy as np

ITEMIDS_FC = [211, 220045] # Heart Rate (CareVue, MetaVision)
ITEMIDS_SPO2 = [646, 220277] # SpO2 (CareVue, MetaVision)
ITEMIDS_TEMP_C = [676, 223762] # Temperature C (CareVue, MetaVision)


def carregar_chartevents(mimic_dir: str) -> pd.DataFrame:
    """Le apenas as colunas e linhas necessarias do CHARTEVENTS.csv (arquivo grande)."""
    itemids_interesse = ITEMIDS_FC + ITEMIDS_SPO2 + ITEMIDS_TEMP_C

    colunas = ["icustay_id", "itemid", "charttime", "valuenum"]
    dtypes = {"icustay_id": "Int64", "itemid": "Int64", "valuenum": "float64"}

    chunks = []
    leitor = pd.read_csv(
        f"{mimic_dir}/CHARTEVENTS.csv",
        usecols=colunas,
        dtype=dtypes,
        parse_dates=["charttime"],
        chunksize=200_000,
    )
    for chunk in leitor:
        filtrado = chunk[chunk["itemid"].isin(itemids_interesse)]
        if not filtrado.empty:
            chunks.append(filtrado)

    df = pd.concat(chunks, ignore_index=True)
    df = df.dropna(subset=["icustay_id", "valuenum"])
    return df


def mapear_sinal(itemid: int) -> str:
    if itemid in ITEMIDS_FC:
        return "fc"
    if itemid in ITEMIDS_SPO2:
        return "spo2"
    if itemid in ITEMIDS_TEMP_C:
        return "temp"
    return "desconhecido"


def montar_tabela_sinais(df_chartevents: pd.DataFrame, janela: str = "h") -> pd.DataFrame:
    """
        Transforma o formato 'long' do CHARTEVENTS (uma linha por leitura/itemid) em um formato 'wide' (uma linha por icustay_id + janela de tempo, com colunas fc/spo2/temp), agrupando leituras na mesma janela.

        O parametro `janela` controla a granularidade do agrupamento (ex: "h" para hora, "30min" para blocos de 30 minutos). Janelas menores tendem a gerar mais linhas, mas tambem mais linhas descartadas por falta de algum dos 3 sinais no mesmo bloco.
        
        Janelas maiores fazem o oposto: menos linhas, porem com sinais mais distantes entre si no tempo.
    """
    df = df_chartevents.copy()
    df["sinal"] = df["itemid"].apply(mapear_sinal)
    df["hora"] = df["charttime"].dt.floor(janela)

    agrupado = (
        df.groupby(["icustay_id", "hora", "sinal"])["valuenum"]
        .mean()
        .reset_index()
    )

    tabela = agrupado.pivot_table(
        index=["icustay_id", "hora"], columns="sinal", values="valuenum"
    ).reset_index()

    tabela = tabela.dropna(subset=["fc", "spo2", "temp"])

    return tabela


def filtrar_fisiologicamente_plausivel(df: pd.DataFrame) -> pd.DataFrame:
    """
        Remove outliers de erro de registro.
        Faixas baseadas em limites fisiologicos amplos para nao descartar casos criticos reais.
    """
    df = df[(df["fc"] > 20) & (df["fc"] < 250)]
    df = df[(df["spo2"] > 50) & (df["spo2"] <= 100)]
    df = df[(df["temp"] > 25) & (df["temp"] < 45)] 
    return df


def calcular_risco_news2(spo2: float, fc: float, temp: float) -> str:
    """
    Escore de risco baseado nos componentes de SpO2, frequencia cardiaca e temperatura do National Early Warning Score 2 (NEWS2), um escore de alerta precoce clinico padronizado e amplamente usado como referencia em estudos de predicao de deterioracao clinica.
    Esta e uma versao SIMPLIFICADA: o NEWS2 completo usa tambem frequencia respiratoria, pressao arterial e nivel de consciencia, que nao fazem parte dos sensores deste projeto.

    Pontuacao por faixa (adaptado do NEWS2 oficial -- Royal College of Physicians):
    - SpO2:  <=91 -> 3 | 92-93 -> 2 | 94-95 -> 1 | >=96 -> 0
    - FC:    <=40 ou >=131 -> 3 | 111-130 -> 2 | 41-50 ou 91-110 -> 1 | 51-90 -> 0
    - Temp:  <=35.0 -> 3 | 35.1-36.0 -> 1 | 36.1-38.0 -> 0 | 38.1-39.0 -> 1 | >=39.1 -> 2

    versao resumida pt-br: (https://med.estrategia.com/portal/conteudos-gratis/procedimentos/resumo-de-news-score-2-criterios-interpretacao-e-mais/)

    Classificacao final (soma dos 3 componentes, 0-9):
      0-1  -> LOW
      2-3  -> MEDIUM
      4-5  -> HIGH
      6+   -> CRITICAL

    NOTA: Este rotulo é uma funcao DETERMINISTICA de spo2, fc e temp. Exatamente as MESMAS 3 variaveis usadas como entrada do modelo de ML. Ou seja, formalmente, risco aqui pode ser calculado por uma formula direta, sem qualquer aprendizado de maquina. O papel do classificador, neste desenho, e aprender a RECONSTRUIR essa formula a partir de exemplos. Essas metricas NAO devem ser lidas como "o quao bem o modelo prediz risco clinico real", elas medem o quao bem o modelo reconstrui o NEWS2 simplificado a partir de sinais possivelmente ruidosos.
    """
    score = 0

    if spo2 <= 91:
        score += 3
    elif spo2 <= 93:
        score += 2
    elif spo2 <= 95:
        score += 1

    if fc <= 40 or fc >= 131:
        score += 3
    elif fc >= 111:
        score += 2
    elif fc <= 50 or fc >= 91:
        score += 1

    if temp <= 35.0:
        score += 3
    elif temp <= 36.0:
        score += 1
    elif temp <= 38.0:
        score += 0
    elif temp <= 39.0:
        score += 1
    else:
        score += 2

    if score >= 6:
        return "CRITICAL"
    elif score >= 4:
        return "HIGH"
    elif score >= 2:
        return "MEDIUM"
    else:
        return "LOW"


def main():
    parser = argparse.ArgumentParser(description="Prepara dataset de treino a partir do MIMIC-III demo.")
    parser.add_argument("--mimic-dir", required=True, help="Caminho da pasta mimic-iii-clinical-database-demo-1.4")
    parser.add_argument("--out", default="dataset_treino.csv", help="Caminho do CSV de saida")
    parser.add_argument("--janela", default="30min", help="Granularidade do alinhamento temporal (ex: 'h', '30min'). Padrao: 30min")
    parser.add_argument(
        "--agrupar-critical-high",
        action="store_true",
        default=True,
        help="Agrupa CRITICAL em HIGH",
    )
    args = parser.parse_args()

    print("Lendo CHARTEVENTS.csv (pode levar alguns segundos...)")
    df_raw = carregar_chartevents(args.mimic_dir)
    print(f"  {len(df_raw)} leituras relevantes encontradas (FC + SpO2 + Temp).")

    print(f"Alinhando sinais por icustay_id + janela de {args.janela}...")
    tabela = montar_tabela_sinais(df_raw, janela=args.janela)
    print(f"  {len(tabela)} instantes com os 3 sinais simultaneos.")

    print("Filtrando valores fisiologicamente implausiveis...")
    tabela = filtrar_fisiologicamente_plausivel(tabela)
    print(f"  {len(tabela)} linhas restantes após filtro.")

    print("Calculando rotulo de risco (NEWS2 simplificado)...")
    tabela["risco"] = tabela.apply(
        lambda row: calcular_risco_news2(row["spo2"], row["fc"], row["temp"]), axis=1
    )

    if args.agrupar_critical_high:
        n_critical = (tabela["risco"] == "CRITICAL").sum()
        if n_critical > 0:
            print(f"Agrupando {n_critical} caso(s) CRITICAL em HIGH")
            tabela["risco"] = tabela["risco"].replace({"CRITICAL": "HIGH"})

    saida = tabela[["icustay_id", "spo2", "fc", "temp", "risco"]].reset_index(drop=True)

    print("\nDistribuicao de classes geradas:")
    print(saida["risco"].value_counts())
    print(f"\nPacientes (icustay_id) unicos no dataset: {saida['icustay_id'].nunique()}")
    
    print(
        "Media de janelas por paciente: "
        f"{len(saida) / saida['icustay_id'].nunique():.1f}"
    )

    saida.to_csv(args.out, index=False)
    print(f"\nDataset salvo em: {args.out} ({len(saida)} linhas)")


if __name__ == "__main__":
    main()