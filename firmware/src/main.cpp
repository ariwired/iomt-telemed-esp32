#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include "MAX30105.h"
#include "spo2_algorithm.h"

#define PIN_LED_GREEN 25
#define PIN_LED_YELLOW 26
#define PIN_LED_RED 27
#define PIN_TEMP 4

OneWire oneWire(PIN_TEMP);
DallasTemperature tempSensor(&oneWire);
MAX30105 particleSensor;

const char* ssid = "nome_wifi";
const char* password = "senha_wifi";
const char* mqtt_server = "broker.hivemq.com"; 
WiFiClient espClient;
PubSubClient client(espClient);

uint32_t irBuffer[100]; 
uint32_t redBuffer[100]; 
int32_t bufferLength = 100;
int32_t spo2; 
int8_t validSPO2;
int32_t heartRate;
int8_t validHeartRate;

void setup_wifi() {
  delay(10);
  Serial.print("Conectando a ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi conectado");
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Tentando conexao MQTT...");
    if (client.connect("ESP32_MedicalNode_01")) {
      Serial.println("conectado");
    } else {
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
    Serial.println("MAX30102 não encontrado. Verifique os jumpers!");
    while (1); 
  }

  particleSensor.setup(60, 4, 2, 400, 411, 4096); 

  setup_wifi();
  client.setServer(mqtt_server, 1883);
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

  String payload = "{";
  payload += "\"paciente_id\": \"12345\",";
  payload += "\"spo2\": " + String(validSPO2 ? spo2 : 0) + ",";
  payload += "\"fc\": " + String(validHeartRate ? heartRate : 0) + ",";
  payload += "\"temp\": " + String(tempC);
  payload += "}";

  client.publish("hospital/fog/monitoramento", payload.c_str());
  Serial.println("Dados enviados: " + payload);
}