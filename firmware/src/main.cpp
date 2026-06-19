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
int32_t lastValidSpo2 = 0;
int32_t lastValidHeartRate = 0;
unsigned long lastValidSpo2Time = 0;
unsigned long lastValidHrTime = 0;
const unsigned long HOLD_TIMEOUT_MS = 8000; 

float smoothedHeartRate = 0; 
const float ALPHA_HR = 0.3; 

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
  tempSensor.setWaitForConversion(false); 

  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("Erro Crítico: MAX30102 não encontrado na via I2C! Verifique os jumpers.");
    while (1); 
  }

  byte ledBrightness = 60; 
  byte sampleAverage = 4; 
  byte ledMode = 2; 
  int sampleRate = 100; 
  int pulseWidth = 411; 
  int adcRange = 4096; 

  particleSensor.setup(ledBrightness, sampleAverage, ledMode, sampleRate, pulseWidth, adcRange);

  setup_wifi();
  client.setServer(MQTT_SERVER, MQTT_PORT);

  Serial.println("Preenchendo buffer inicial do MAX30102...");
  for (byte i = 0; i < bufferLength; i++) {
    while (particleSensor.available() == false) particleSensor.check();
    redBuffer[i] = particleSensor.getRed();
    irBuffer[i] = particleSensor.getIR();
    particleSensor.nextSample();
  }
  Serial.println("Buffer preenchido! Pronto para leitura do dedo.");
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  for (byte i = 25; i < 100; i++) {
    redBuffer[i - 25] = redBuffer[i];
    irBuffer[i - 25] = irBuffer[i];
  }

  for (byte i = 75; i < 100; i++) {
    while (particleSensor.available() == false) particleSensor.check();
    redBuffer[i] = particleSensor.getRed();
    irBuffer[i] = particleSensor.getIR();
    particleSensor.nextSample(); 
  }

  maxim_heart_rate_and_oxygen_saturation(irBuffer, bufferLength, redBuffer, &spo2, &validSPO2, &heartRate, &validHeartRate);

  bool saturado = irBuffer[99] >= 200000; 
  bool dedoPresente = irBuffer[99] > 20000 && !saturado;

  bool fcOk = validHeartRate && dedoPresente && heartRate > 45 && heartRate < 160;
  bool spo2Ok = validSPO2 && dedoPresente && spo2 >= 85 && spo2 <= 100;

  unsigned long now = millis();

  if (fcOk) {
    if (smoothedHeartRate == 0) smoothedHeartRate = heartRate; 
    smoothedHeartRate = (ALPHA_HR * heartRate) + ((1.0 - ALPHA_HR) * smoothedHeartRate);
    
    lastValidHeartRate = (int32_t)smoothedHeartRate;
    lastValidHrTime = now; 
  }
  
  if (spo2Ok) {
    lastValidSpo2 = spo2;
    lastValidSpo2Time = now;
  }

  if (now - lastMsg > 5000) { 
    lastMsg = now;

    float tempC = tempSensor.getTempCByIndex(0);
    tempSensor.requestTemperatures(); 

    bool hrHold = dedoPresente && (now - lastValidHrTime < HOLD_TIMEOUT_MS); 
    bool spo2Hold = dedoPresente && (now - lastValidSpo2Time < HOLD_TIMEOUT_MS); 

    int32_t spo2ToSend = spo2Hold ? lastValidSpo2 : 0;
    int32_t fcToSend = hrHold ? lastValidHeartRate : 0;

    if (spo2Hold) {
      updateAlerts(tempC, spo2ToSend);
    } else {
      digitalWrite(PIN_LED_GREEN, LOW);
      digitalWrite(PIN_LED_YELLOW, LOW);
      digitalWrite(PIN_LED_RED, LOW);
      smoothedHeartRate = 0; 
    }

    char payloadBuffer[128];
    snprintf(payloadBuffer, sizeof(payloadBuffer), 
             "{\"paciente_id\": \"%s\", \"spo2\": %d, \"fc\": %d, \"temp\": %.2f}", 
             PACIENTE_ID, spo2ToSend, fcToSend, tempC);

    client.publish(MQTT_TOPIC, payloadBuffer);
    
    Serial.print("Telemed Edge-to-Fog: ");
    Serial.println(payloadBuffer);
  }
}