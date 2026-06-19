#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include "MAX30105.h"
#include "spo2_algorithm.h"
#include "config.h"

OneWire oneWire(PIN_TEMP);
DallasTemperature tempSensor(&oneWire);
MAX30105 particleSensor;

WiFiClient espClient;
PubSubClient client(espClient);

uint32_t irBuffer[100]; 
uint32_t redBuffer[100]; 
int32_t bufferLength = 100;
int32_t spo2; 
int8_t validSPO2;
int32_t heartRate;
int8_t validHeartRate;

unsigned long lastMsg = 0;

void setup_wifi() {
  delay(10);
  Serial.print("Conectando a ");
  Serial.println(WIFI_SSID); 
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi conectado");
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Tentando conexao MQTT...");
    if (client.connect(MQTT_CLIENT_ID)) {
      Serial.println("conectado ao Fog Node");
    } else {
      Serial.print("falhou, rc=");
      Serial.print(client.state());
      Serial.println(" tentando novamente em 2 segundos");
      delay(2000);
    }
  }
}

void updateAlerts(float temp, int32_t spo2_val) {
  digitalWrite(PIN_LED_GREEN, LOW);
  digitalWrite(PIN_LED_YELLOW, LOW);
  digitalWrite(PIN_LED_RED, LOW);

  if (spo2_val <= 0) return; 

  if (spo2_val < 90 || temp > 38.5) {
    digitalWrite(PIN_LED_RED, HIGH);
  } else if (spo2_val < 95 || temp > 37.5) {
    digitalWrite(PIN_LED_YELLOW, HIGH);
  } else {
    digitalWrite(PIN_LED_GREEN, HIGH);
  }
}

void setup() {
  Serial.begin(115200);
  
  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_LED_YELLOW, OUTPUT);
  pinMode(PIN_LED_RED, OUTPUT);

  Wire.begin(21, 22);

  tempSensor.begin();

  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("Erro Crítico: MAX30102 não encontrado na via I2C! Verifique os jumpers.");
    while (1); 
  }

  particleSensor.setup(60, 4, 2, 400, 411, 4096); 

  setup_wifi();
  
  client.setServer(MQTT_SERVER, MQTT_PORT);
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  tempSensor.requestTemperatures();
  float tempC = tempSensor.getTempCByIndex(0);

  for (byte i = 0; i < bufferLength; i++) {
    while (particleSensor.available() == false) particleSensor.check();
    redBuffer[i] = particleSensor.getRed();
    irBuffer[i] = particleSensor.getIR();
    particleSensor.nextSample(); 
  }

  maxim_heart_rate_and_oxygen_saturation(irBuffer, bufferLength, redBuffer, &spo2, &validSPO2, &heartRate, &validHeartRate);

  if (validSPO2) {
    updateAlerts(tempC, spo2);
  }

  unsigned long now = millis();
  if (now - lastMsg > 5000) { // cada 5 segundos
    lastMsg = now;

    String payload = "{";
    payload += "\"paciente_id\": \"" + String(PACIENTE_ID) + "\",";
    payload += "\"spo2\": " + String(validSPO2 ? spo2 : 0) + ",";
    payload += "\"fc\": " + String(validHeartRate ? heartRate : 0) + ",";
    payload += "\"temp\": " + String(tempC);
    payload += "}";

    client.publish(MQTT_TOPIC, payload.c_str());
    Serial.println("Telemed Edge-to-Fog: " + payload);
  }
}