// ============================================================
// TESTE DE INTEGRACAO: DS18B20 + MAX30102 + LEDs
//
// Objetivo: rodar os dois sensores JUNTOS, ja calibrados/testados isoladamente, acionando os LEDs de status. SEM WiFi/MQTT!

// Baseado em:
//   - src_tests/dsb_teste/main.cpp (offset + estabilizacao)
//   - src_tests/max_teste_comparativo/main.cpp (padrao vs RF)
//
// Estrategia de fusao MAX30102: RF como fonte principal; se o RF rejeitar, cai para o algoritmo padrao (Maxim/SparkFun) como fallback.
// ============================================================

#include <Arduino.h>
#include <Wire.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include "MAX30105.h"
#include "spo2_algorithm.h"

#undef BUFFER_SIZE
#include "algorithm_by_RF.h"

#include "config.h" // reaproveita PIN_TEMP, PIN_LED_GREEN/YELLOW/RED do projeto

// DS18B20: calibracao e estabilizacao (mesmos valores do teste isolado)

#define OFFSET_CALIBRACAO 1.57
#define LIMIAR_ESTAVEL 0.10f
#define AMOSTRAS_ESTAVEIS 5
#define TEMP_CYCLE_MS 5000UL
#define DEBUG_VERBOSE 0
#define TELEPLOT_ENABLED 1
#define TEMP_CONVERSION_MS 750UL

OneWire oneWire(PIN_TEMP);
DallasTemperature tempSensor(&oneWire);

float ultimaLeituraBruta = NAN;
int contadorEstavel = 0;
bool tempEstabilizada = false;
float tempCalibradaAtual = NAN; // ultima leitura JA estabilizada (usada nos LEDs)
bool conversaoEmAndamento = false;
unsigned long lastTempRequest = 0;

// MAX30102: buffer e resultado combinado (RF + fallback padrao)
#define MEU_BUFFER_SIZE 100
MAX30105 particleSensor;
uint32_t irBuffer[MEU_BUFFER_SIZE];
uint32_t redBuffer[MEU_BUFFER_SIZE];

int32_t spo2Atual = 0;
int32_t bpmAtual = 0;
bool leituraMaxValida = false;
const char* fonteMaxAtual = "-";
unsigned long lastValidMaxTime = 0;
const unsigned long MAX_HOLD_TIMEOUT_MS = 8000UL;

unsigned long lastStatusPrint = 0;
const unsigned long STATUS_PRINT_MS = 5000;

void setupDS18B20() {
  tempSensor.begin();
  tempSensor.setWaitForConversion(false);

  int qtd = tempSensor.getDeviceCount();
  Serial.print("DS18B20 encontrados no barramento: ");
  Serial.println(qtd);
  if (qtd == 0) {
    Serial.println("[DS18B20] ALERTA: nenhum sensor no barramento.");
  } else {
    Serial.print("[DS18B20] Offset de calibracao aplicado: +");
    Serial.println(OFFSET_CALIBRACAO);
  }
}

void setupMAX30102() {
  Wire.begin(21, 22); // SDA=21, SCL=22

  Serial.print("[MAX30102] Procurando no barramento I2C... ");
  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("[MAX30102] NAO ENCONTRADO!");
    while (true) delay(1000);
  }
  Serial.println("OK.");

  byte ledBrightness = 0x1F;
  byte sampleAverage = 4;
  byte ledMode = 2; // Red + IR
  int sampleRate = 100;
  int pulseWidth = 411;
  int adcRange = 4096;
  particleSensor.setup(ledBrightness, sampleAverage, ledMode, sampleRate, pulseWidth, adcRange);
}

void atualizarDS18B20() {
  unsigned long agora = millis();

  if (!conversaoEmAndamento && (agora - lastTempRequest >= TEMP_CYCLE_MS)) {
    tempSensor.requestTemperatures();
    conversaoEmAndamento = true;
    lastTempRequest = agora;
    return;
  }

  if (!conversaoEmAndamento || (agora - lastTempRequest < TEMP_CONVERSION_MS)) return;

  conversaoEmAndamento = false;
  float bruta = tempSensor.getTempCByIndex(0);

  if (bruta == DEVICE_DISCONNECTED_C || bruta == 85.0) {
    Serial.println("[DS18B20] ERRO ou leitura suspeita. Confira a fiacao.");
    contadorEstavel = 0;
    tempEstabilizada = false;
    return;
  }

  float calibrada = bruta + OFFSET_CALIBRACAO;

  if (!isnan(ultimaLeituraBruta) && fabs(bruta - ultimaLeituraBruta) < LIMIAR_ESTAVEL) {
    contadorEstavel++;
  } else {
    contadorEstavel = 0;
  }
  ultimaLeituraBruta = bruta;
  tempEstabilizada = (contadorEstavel >= AMOSTRAS_ESTAVEIS);

  tempCalibradaAtual = calibrada;

  Serial.print("[DS18B20] Bruta: ");
  Serial.print(bruta, 2);
  Serial.print(" C | Calibrada (+");
  Serial.print(OFFSET_CALIBRACAO);
  Serial.print("): ");
  Serial.print(calibrada, 2);
  Serial.print(" C | ");

  if (tempEstabilizada) {
    Serial.println("ESTAVEL - leitura valida");
  } else {
    Serial.print("estabilizando... (");
    Serial.print(contadorEstavel);
    Serial.print("/");
    Serial.print(AMOSTRAS_ESTAVEIS);
    Serial.println(")");
  }
}

int idxBufferMAX = 0;

void atualizarMAX30102() {
  particleSensor.check();

  while (particleSensor.available()) {
    redBuffer[idxBufferMAX] = particleSensor.getFIFORed();
    irBuffer[idxBufferMAX]  = particleSensor.getFIFOIR();
    particleSensor.nextSample();
    idxBufferMAX++;

    if (idxBufferMAX >= MEU_BUFFER_SIZE) {
      int32_t spo2Padrao; int8_t validoSpo2Padrao;
      int32_t bpmPadrao;  int8_t validoBpmPadrao;
      maxim_heart_rate_and_oxygen_saturation(
        irBuffer, MEU_BUFFER_SIZE, redBuffer,
        &spo2Padrao, &validoSpo2Padrao, &bpmPadrao, &validoBpmPadrao
      );

      float spo2RF; int8_t validoSpo2RF;
      int32_t bpmRF; int8_t validoBpmRF;
      float ratioRF, correlRF;
      rf_heart_rate_and_oxygen_saturation(
        irBuffer, MEU_BUFFER_SIZE, redBuffer,
        &spo2RF, &validoSpo2RF, &bpmRF, &validoBpmRF, &ratioRF, &correlRF
      );

      if (validoSpo2RF && validoBpmRF) {
        spo2Atual = (int32_t)round(spo2RF);
        bpmAtual = bpmRF;
        leituraMaxValida = true;
        fonteMaxAtual = "RF";
        lastValidMaxTime = millis();
      } else if (validoSpo2Padrao && validoBpmPadrao) {
        spo2Atual = spo2Padrao;
        bpmAtual = bpmPadrao;
        leituraMaxValida = true;
        fonteMaxAtual = "PADRAO";
        lastValidMaxTime = millis();
      } else {
        leituraMaxValida = false;
        fonteMaxAtual = "SEM LEITURA";
        if (millis() - lastValidMaxTime > MAX_HOLD_TIMEOUT_MS) {
          spo2Atual = 0;
          bpmAtual = 0;
        }
      }

      #if DEBUG_VERBOSE
        Serial.print("[MAX30102] fonte="); Serial.print(fonteMaxAtual);
        Serial.print(" BPM: "); Serial.print(bpmAtual);
        Serial.print(" | SpO2: "); Serial.println(spo2Atual);
      #endif

      idxBufferMAX = 0;
    }
  }
}
/*
void atualizarLEDs() {
  digitalWrite(PIN_LED_GREEN, LOW);
  digitalWrite(PIN_LED_YELLOW, LOW);
  digitalWrite(PIN_LED_RED, LOW);

  if (!leituraMaxValida || isnan(tempCalibradaAtual)) return;

  if (spo2Atual < 90 || tempCalibradaAtual > 38.5) {
    digitalWrite(PIN_LED_RED, HIGH);
  } else if (spo2Atual < 95 || tempCalibradaAtual > 37.5) {
    digitalWrite(PIN_LED_YELLOW, HIGH);
  } else {
    digitalWrite(PIN_LED_GREEN, HIGH);
  }
}
*/

void imprimirStatus() {
  unsigned long agora = millis();
  if (agora - lastStatusPrint < STATUS_PRINT_MS) return;
  lastStatusPrint = agora;

  float tempMostrar = isnan(tempCalibradaAtual) ? 0.0 : tempCalibradaAtual;

  Serial.printf(
    "[STATUS] t=%6lus | SpO2:%4ld%% | BPM:%4ld (%-11s) | Temp:%7.2fC (%s)\n",
    agora / 1000,
    spo2Atual, bpmAtual, fonteMaxAtual,
    tempMostrar,
    tempEstabilizada ? "ESTAVEL" : "estabilizando"
  );

#if TELEPLOT_ENABLED
  Serial.print(">SpO2:"); Serial.println(spo2Atual);
  Serial.print(">BPM:"); Serial.println(bpmAtual);
  Serial.print(">Temp:"); Serial.println(tempMostrar);
#endif
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println();
  Serial.println("TESTE DE INTEGRACAO: DS18B20 + MAX30102 + LEDs");

  // pinMode(PIN_LED_GREEN, OUTPUT);
  // pinMode(PIN_LED_YELLOW, OUTPUT);
  // pinMode(PIN_LED_RED, OUTPUT);

  setupDS18B20();
  setupMAX30102();

  Serial.println("Setup concluido. Coloque o dedo sobre o MAX30102.");
  Serial.println();
}

void loop() {
  atualizarDS18B20();
  atualizarMAX30102();
  // atualizarLEDs();
  imprimirStatus();
}