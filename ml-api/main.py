from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import pandas as pd
import os

app = FastAPI(title="IA Preditiva")

MODEL_PATH = "random_forest_model.pkl"
if os.path.exists(MODEL_PATH):
    model = joblib.load(MODEL_PATH)
    print("Modelo carregado com sucesso!")
else:
    raise RuntimeError("Arquivo random_forest_model.pkl não encontrado.")

class VitalSigns(BaseModel):
    spo2: int
    fc: int
    temp: float

@app.post("/predict")
def predict_risk(vitals: VitalSigns):
    print(f"Dados recebidos do BackEnd: SpO2={vitals.spo2}%, FC={vitals.fc}, Temp={vitals.temp}C")

    input_data = pd.DataFrame([{
        'spo2': vitals.spo2,
        'fc': vitals.fc,
        'temp': vitals.temp
    }])
    
    try:
        prediction = model.predict(input_data)[0]
        probabilities = model.predict_proba(input_data)[0]

        confidence_score = max(probabilities)
        
        print(f"Resultado da IA: Nível {prediction} (Confiança: {confidence_score:.2f})")
        
        return {
            "score": float(confidence_score),
            "level": prediction
        }
    except Exception as e:
        print(f"Erro na inferência: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao processar a inferência.")