// ============================================================
// TESTE ISOLADO - MAX30102 (sensor de SpO2 / batimentos)
//
// Objetivo: validar SOMENTE a deteccao e leitura bruta do MAX30102
// no barramento I2C, sem WiFi, sem MQTT, sem DS18B20, sem LEDs.
// ============================================================

#include <Arduino.h>
#include <Wire.h>
#include "MAX30105.h"

#define PIN_SDA 21
#define PIN_SCL 22

MAX30105 particleSensor;

unsigned long lastRead = 0;
const unsigned long INTERVALO_LEITURA = 200; // ms

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("TESTE MAX30102");

  Wire.begin(PIN_SDA, PIN_SCL);

  Serial.print("Procurando MAX30102 no barramento I2C... ");

  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("NAO ENCONTRADO!");
    Serial.println("Verifique: VIN/3V3, GND, SDA no GPIO21, SCL no GPIO22.");
    while (true) {
      delay(1000);
    }
  }

  Serial.println("ENCONTRADO!");
  Serial.println("Configurando sensor...");

  byte ledBrightness = 0x1F; // 0-255
  byte sampleAverage = 4;    // 1, 2, 4, 8, 16, 32
  byte ledMode = 2;          // 1 = Red only, 2 = Red + IR, 3 = Red + IR + Green
  int sampleRate = 100;      // 50, 100, 200, 400, 800, 1000, 1600, 3200
  int pulseWidth = 411;      // 69, 118, 215, 411
  int adcRange = 4096;       // 2048, 4096, 8192, 16384

  particleSensor.setup(ledBrightness, sampleAverage, ledMode, sampleRate, pulseWidth, adcRange);

  Serial.println("Sensor configurado. Iniciando leituras...");
  Serial.println("Coloque o dedo sobre o sensor.");
}

void loop() {
  unsigned long now = millis();

  if (now - lastRead > INTERVALO_LEITURA) {
    lastRead = now;

    long irValue = particleSensor.getIR();
    long redValue = particleSensor.getRed();

    Serial.print("IR: ");
    Serial.print(irValue);
    Serial.print(" | RED: ");
    Serial.print(redValue);

    if (irValue < 50000) {
      Serial.println(" | SEM DEDO/CONTATO detectado");
    } else {
      Serial.println(" | Contato detectado - leitura valida");
    }
  }
}