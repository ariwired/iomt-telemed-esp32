// ============================================================
// TESTE COMPARATIVO - MAX30102
// Algoritmo padrao (SparkFun/Maxim) vs. Algoritmo_by_RF
//
// Objetivo: gerar BPM e SpO2 com DOIS algoritmos diferentes,
// usando o MESMO buffer de amostras brutas (IR/RED), para
// permitir comparacao direta.
// 
// ! antes de compilar, verifique se o "algorithm_by_RF" esta na pasta "lib" do projeto (lib/algorithm_by_RF).
// Se não estiver, rode:
// wget https://raw.githubusercontent.com/aromring/MAX30102_by_RF/master/algorithm_by_RF.h
// wget https://raw.githubusercontent.com/aromring/MAX30102_by_RF/master/algorithm_by_RF.cpp
// Esse algoritmo só recebe buffers de IR/RED já lidos e devolve BPM + SpO2 + indicadores de
// qualidade (autocorrelação e correlação de Pearson). Mais info na DOC.
// ============================================================

#include <Arduino.h>
#include <Wire.h>
#include "MAX30105.h"
#include "spo2_algorithm.h"

#undef BUFFER_SIZE

#include "algorithm_by_RF.h"

#define PIN_SDA 21
#define PIN_SCL 22

#define MEU_BUFFER_SIZE 100

MAX30105 particleSensor;

uint32_t irBuffer[MEU_BUFFER_SIZE];
uint32_t redBuffer[MEU_BUFFER_SIZE];

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("TESTE COMPARATIVO MAX30102 - Padrao SparkFun vs algorithm_by_RF");

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

  byte ledBrightness = 0x1F;
  byte sampleAverage = 4;
  byte ledMode = 2; // Red + IR
  int sampleRate = 100;
  int pulseWidth = 411;
  int adcRange = 4096;

  particleSensor.setup(ledBrightness, sampleAverage, ledMode, sampleRate, pulseWidth, adcRange);

  Serial.println("Sensor configurado. Coloque o dedo sobre o sensor.");
  Serial.println();
  Serial.println("formato: BPM_padrao;valido | SpO2_padrao;valido || BPM_RF;valido | SpO2_RF;valido | autocorr | pearson");
}

void preencherBuffer() {
  for (int i = 0; i < MEU_BUFFER_SIZE; i++) {
    while (particleSensor.available() == false) {
      particleSensor.check();
    }
    redBuffer[i] = particleSensor.getFIFORed();
    irBuffer[i]  = particleSensor.getFIFOIR();
    particleSensor.nextSample();
  }
}

void loop() {
  preencherBuffer();

  // SparkFun / Maxim
  int32_t spo2Padrao;
  int8_t  spo2ValidoPadrao;
  int32_t bpmPadrao;
  int8_t  bpmValidoPadrao;

  maxim_heart_rate_and_oxygen_saturation(
    irBuffer, MEU_BUFFER_SIZE, redBuffer,
    &spo2Padrao, &spo2ValidoPadrao,
    &bpmPadrao, &bpmValidoPadrao
  );

  // algorithm_by_RF
  float spo2RF;
  int8_t spo2ValidoRF;
  int32_t bpmRF;
  int8_t bpmValidoRF;
  float ratioRF;   // razao usada no calculo de SpO2 (diagnostico)
  float correlRF;  // correlacao de Pearson (indicador de qualidade)

  rf_heart_rate_and_oxygen_saturation(
    irBuffer, MEU_BUFFER_SIZE, redBuffer,
    &spo2RF, &spo2ValidoRF,
    &bpmRF, &bpmValidoRF,
    &ratioRF, &correlRF
  );

  Serial.print("PADRAO  -> BPM: ");
  Serial.print(bpmPadrao);
  Serial.print(" (valido=");
  Serial.print(bpmValidoPadrao);
  Serial.print(") | SpO2: ");
  Serial.print(spo2Padrao);
  Serial.print(" (valido=");
  Serial.print(spo2ValidoPadrao);
  Serial.print(")");

  Serial.print("   ||   RF -> BPM: ");
  Serial.print(bpmRF);
  Serial.print(" (valido=");
  Serial.print(bpmValidoRF);
  Serial.print(") | SpO2: ");
  Serial.print(spo2RF, 2);
  Serial.print(" (valido=");
  Serial.print(spo2ValidoRF);
  Serial.print(") | correl=");
  Serial.print(correlRF, 3);
  Serial.print(" | ratio=");
  Serial.println(ratioRF, 3);
}