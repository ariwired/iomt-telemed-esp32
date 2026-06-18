import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
import joblib

print("Gerando dados sintéticos para treinamento...")
np.random.seed(42)
num_samples = 2000

spo2 = np.random.randint(80, 100, num_samples)
fc = np.random.randint(40, 140, num_samples)
temp = np.random.uniform(35.0, 40.5, num_samples)

def calcular_risco(s, f, t):
    score = 0
    if s < 90: score += 3
    elif s < 94: score += 1
    
    if f < 50 or f > 120: score += 2
    elif f > 100: score += 1
    
    if t > 38.5: score += 2
    elif t > 37.5: score += 1
    
    if score >= 4: return "CRITICAL"
    elif score >= 2: return "HIGH"
    elif score >= 1: return "MEDIUM"
    else: return "LOW"

risco = [calcular_risco(s, f, t) for s, f, t in zip(spo2, fc, temp)]

df = pd.DataFrame({'spo2': spo2, 'fc': fc, 'temp': temp, 'risco': risco})

X = df[['spo2', 'fc', 'temp']]
y = df['risco']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

print("Treinando a Random Forest...")
model = RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42)
model.fit(X_train, y_train)

score = model.score(X_test, y_test)
print(f"Treinamento concluído! Acurácia do modelo: {score * 100:.2f}%")

joblib.dump(model, 'random_forest_model.pkl')