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
#define TEMP_CYCLE_MS 2000UL

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

void setupDS18B20() {
  tempSensor.begin();
  tempSensor.setWaitForConversion(false); 

  int qtd = tempSensor.getDeviceCount();
  Serial.print("[DS18B20] Sensores encontrados: ");
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

  // ainda nao terminou -> nao bloqueia o loop, apenas retorna
  if (!conversaoEmAndamento || !tempSensor.isConversionComplete()) return;

  conversaoEmAndamento = false;
  float bruta = tempSensor.getTempCByIndex(0);

  if (bruta == DEVICE_DISCONNECTED_C) {
    Serial.println("[DS18B20] ERRO: sensor desconectado (-127). Confira a fiacao.");
    contadorEstavel = 0;
    tempEstabilizada = false;
    return;
  }
  if (bruta == 85.0) {
    Serial.println("[DS18B20] Leitura suspeita (85.0C). Sensor pode estar desconectado. Confira a fiacao.");
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

  if (tempEstabilizada) {
    tempCalibradaAtual = calibrada; // so alimenta os LEDs quando ja em equilibrio termico
  }

  Serial.print("[DS18B20] Bruta: "); Serial.print(bruta, 2);
  Serial.print(" C | Calibrada: "); Serial.print(calibrada, 2);
  Serial.print(" C | ");
  Serial.println(tempEstabilizada ? "ESTAVEL" : "estabilizando...");
}

void preencherBufferMAX() {
  for (int i = 0; i < MEU_BUFFER_SIZE; i++) {
    while (particleSensor.available() == false) particleSensor.check();
    redBuffer[i] = particleSensor.getFIFORed();
    irBuffer[i]  = particleSensor.getFIFOIR();
    particleSensor.nextSample();
  }
}

void atualizarMAX30102() {
  preencherBufferMAX(); // ~1s por ciclo (100 amostras a 100Hz)

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
    Serial.print("[MAX30102] fonte=RF     ");
  } else if (validoSpo2Padrao && validoBpmPadrao) {
    spo2Atual = spo2Padrao;
    bpmAtual = bpmPadrao;
    leituraMaxValida = true;
    Serial.print("[MAX30102] fonte=PADRAO (RF rejeitou) ");
  } else {
    leituraMaxValida = false;
    Serial.print("[MAX30102] SEM leitura valida (RF e PADRAO rejeitaram) ");
  }

  Serial.print("BPM: "); Serial.print(bpmAtual);
  Serial.print(" | SpO2: "); Serial.println(spo2Atual);
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
}