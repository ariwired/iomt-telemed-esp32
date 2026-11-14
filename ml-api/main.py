from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import joblib
import pandas as pd
import os

app = FastAPI(title="IA Preditiva")

MODEL_PATH = "model.pkl"

if not os.path.exists(MODEL_PATH):
    raise RuntimeError(f"Arquivo {MODEL_PATH} não encontrado. Rode train.py primeiro.")

artefato = joblib.load(MODEL_PATH)

if isinstance(artefato, dict):
    model = artefato["modelo"]
    label_encoder = artefato.get("label_encoder")
    nome_modelo = artefato.get("nome", "desconhecido")
    balanceamento = artefato.get("balanceamento", "none")
    features = artefato.get("features", ["spo2", "fc", "temp"])
else:
    model = artefato
    label_encoder = None
    nome_modelo = "modelo (formato legado)"
    balanceamento = "desconhecido"
    features = ["spo2", "fc", "temp"]

print(f"Modelo carregado com sucesso! ({nome_modelo}, balanceamento={balanceamento})")

# Gravidade de cada nível em [0, 1]. O risk_score é a média desses pesos
# ponderada pelas probabilidades do modelo (gravidade esperada).
PESO_GRAVIDADE = {"LOW": 0.0, "MEDIUM": 1 / 3, "HIGH": 2 / 3, "CRITICAL": 1.0}


def nomes_das_classes():
    """Nome de cada coluna de predict_proba, na mesma ordem."""
    classes = list(model.classes_)
    if label_encoder is not None:
        classes = list(label_encoder.inverse_transform(classes))
    return [str(c).strip().upper() for c in classes]


CLASSES = nomes_das_classes()
desconhecidas = [c for c in CLASSES if c not in PESO_GRAVIDADE]
if desconhecidas:
    raise RuntimeError(f"Classes sem peso de gravidade definido: {desconhecidas}")
print(f"Classes do modelo: {CLASSES}")


class VitalSigns(BaseModel):
    """
        Faixas (ge/le) baseadas nos mesmos limites fisiologicamente plausiveis.
    """
    spo2: float = Field(..., ge=50, le=100, description="Saturação de oxigênio (%)")
    fc: float = Field(..., ge=20, le=250, description="Frequência cardíaca (bpm)")
    temp: float = Field(..., ge=25, le=45, description="Temperatura corporal (°C)")


@app.post("/predict")
def predict_risk(vitals: VitalSigns):
    print(f"Dados recebidos do BackEnd: SpO2={vitals.spo2}%, FC={vitals.fc}, Temp={vitals.temp}C")

    input_data = pd.DataFrame([{
        "spo2": vitals.spo2,
        "fc": vitals.fc,
        "temp": vitals.temp,
    }])[features]

    try:
        probabilities = model.predict_proba(input_data)[0]
        indice = int(probabilities.argmax())
        level = CLASSES[indice]
        confidence = float(probabilities[indice])
        risk_score = float(sum(p * PESO_GRAVIDADE[c] for p, c in zip(probabilities, CLASSES)))

        print(f"Resultado da IA: Nível {level} | gravidade {risk_score:.2f} | confiança {confidence:.2f}")

        return {
            # Gravidade esperada em [0, 1]: 0 = certamente LOW, 1 = certamente CRITICAL.
            "risk_score": risk_score,
            # Probabilidade da classe prevista (o quanto o modelo está seguro do nível).
            "confidence": confidence,
            "level": level,
            "probabilidades": {c: float(p) for c, p in zip(CLASSES, probabilities)},
            "modelo_usado": nome_modelo,
        }
    except Exception as e:
        print(f"Erro na inferência: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao processar a inferência.")


@app.get("/health")
def health_check():
    return {"status": "ok", "modelo_carregado": nome_modelo, "balanceamento": balanceamento, "classes": CLASSES}