import paho.mqtt.client as mqtt
import time
import json
import random

BROKER = "127.0.0.1" 
PORT = 1883
TOPIC = "hospital/fog/monitoramento"

client = mqtt.Client(client_id="Simulador_Critico_02")
client.connect(BROKER, PORT, 60)

try:
    while True:
        payload = {
            "paciente_id": "CRITICO_02",
            "spo2": random.randint(85, 89),
            "fc": random.randint(110, 125),
            "temp": round(random.uniform(39.0, 40.5), 1)
        }
        
        mensagem = json.dumps(payload)
        client.publish(TOPIC, mensagem)
        print(f"Enviado: {mensagem}")
        
        time.sleep(2)
except KeyboardInterrupt:
    print("\nSimulador encerrado.")
    client.disconnect()