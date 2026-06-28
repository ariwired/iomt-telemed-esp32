from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import pandas as pd
import os

app = FastAPI(title="IA Preditiva")

MODEL_PATH = "random_forest_model.pkl"

if not os.path.exists(MODEL_PATH):
    raise RuntimeError(f"Arquivo {MODEL_PATH} não encontrado. Rode train.py primeiro.")

artefato = joblib.load(MODEL_PATH)

if isinstance(artefato, dict):
    model = artefato["modelo"]
    scaler = artefato.get("scaler")
    label_encoder = artefato.get("label_encoder")
    nome_modelo = artefato.get("nome", "desconhecido")
    balanceamento = artefato.get("balanceamento", "none")
else:
    model = artefato
    scaler = None
    label_encoder = None
    nome_modelo = "RandomForest (formato legado)"
    balanceamento = "desconhecido"

print(f"Modelo carregado com sucesso! ({nome_modelo}, balanceamento={balanceamento})")


class VitalSigns(BaseModel):
    spo2: int
    fc: int
    temp: float


@app.post("/predict")
def predict_risk(vitals: VitalSigns):
    print(f"Dados recebidos do BackEnd: SpO2={vitals.spo2}%, FC={vitals.fc}, Temp={vitals.temp}C")

    input_data = pd.DataFrame([{
        "spo2": vitals.spo2,
        "fc": vitals.fc,
        "temp": vitals.temp,
    }])

    try:
        input_processado = scaler.transform(input_data) if scaler is not None else input_data

        prediction_raw = model.predict(input_processado)[0]
        probabilities = model.predict_proba(input_processado)[0]
        confidence_score = max(probabilities)

        if label_encoder is not None:
            prediction = label_encoder.inverse_transform([prediction_raw])[0]
        else:
            prediction = prediction_raw

        print(f"Resultado da IA: Nível {prediction} (Confiança: {confidence_score:.2f})")

        return {
            "score": float(confidence_score),
            "level": str(prediction),
            "modelo_usado": nome_modelo,
        }
    except Exception as e:
        print(f"Erro na inferência: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao processar a inferência.")


@app.get("/health")
def health_check():
    return {"status": "ok", "modelo_carregado": nome_modelo, "balanceamento": balanceamento}