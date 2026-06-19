// ============================================================
// TESTE ISOLADO DS18B20
//
// Objetivo: validar a leitura de temperatura com:
//   1) Offset de calibração (pele -> aproximação de temp. central)
//   2) Detecção de estabilização (só reporta leitura "valida"
//      quando o sensor parou de variar, ou seja, atingiu
//      equilibrio termico com o ponto de contato)

// ============================================================

#include <Arduino.h>
#include <OneWire.h>
#include <DallasTemperature.h>

#define PIN_TEMP 4

// ------------------------------------------------------------
// CALIBRAÇÃO
// ------------------------------------------------------------
// OFFSET_CALIBRACAO: diferença entre o termômetro e a leitura ESTABILIZADA 
// no mesmo ponto de contato, na mesma pessoa, no mesmo
// instante.
//
// offset = temp_referencia - temp_ds18b20_estabilizada
// Exemplo: referência marcou 36.5°C, DS18B20 estabilizou em 31.8°C-> offset = 36.5 - 31.8 = 4.7
// O valor do offset pode variar dependendo do local de contato, pessoa, etc.

#define OFFSET_CALIBRACAO 4.7

// ------------------------------------------------------------
// DETECÇÃO DE ESTABILIZAÇÃO
// ------------------------------------------------------------
// Considera a leitura "estável" quando a variação entre amostras
// consecutivas for menor que LIMIAR_ESTAVEL por pelo menos
// AMOSTRAS_ESTAVEIS leituras seguidas.
#define LIMIAR_ESTAVEL 0.10f // variação máxima aceita entre leituras (°C)
#define AMOSTRAS_ESTAVEIS 5 // quantidade de leituras seguidas dentro do limiar

OneWire oneWire(PIN_TEMP);
DallasTemperature tempSensor(&oneWire);

unsigned long lastRead = 0;
float ultimaLeitura = NAN;
int contadorEstavel = 0;
bool estabilizado = false;

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("TESTE DS18B20");

  tempSensor.begin();

  int qtdSensores = tempSensor.getDeviceCount();
  Serial.print("Sensores DS18B20 encontrados no barramento: ");
  Serial.println(qtdSensores);

  if (qtdSensores == 0) {
    Serial.println("NENHUM sensor encontrado!");
    Serial.println("Verifique: fio DATA no GPIO4, VCC, GND e o resistor de pull-up.");
  } else {
    Serial.println("Sensor encontrado. Iniciando leituras...");
    Serial.print("Offset de calibracao aplicado: +");
    Serial.println(OFFSET_CALIBRACAO);
  }
}

void loop() {
  unsigned long now = millis();

  if (now - lastRead > 2000) {
    lastRead = now;

    tempSensor.requestTemperatures();
    float tempBruta = tempSensor.getTempCByIndex(0);

    if (tempBruta == DEVICE_DISCONNECTED_C) {
      Serial.println("Temperatura: ERRO - sensor desconectado (-127). Confira a fiacao.");
      contadorEstavel = 0;
      estabilizado = false;
      return;
    }

    if (tempBruta == 85.0) {
      Serial.println("Temperatura: 85.00 C -> leitura suspeita (provavel pull-up ausente ou sensor nao respondeu a tempo).");
      contadorEstavel = 0;
      estabilizado = false;
      return;
    }

    float tempCalibrada = tempBruta + OFFSET_CALIBRACAO;

    // checa estabilização (compara com a leitura bruta anterior)
    if (!isnan(ultimaLeitura) && fabs(tempBruta - ultimaLeitura) < LIMIAR_ESTAVEL) {
      contadorEstavel++;
    } else {
      contadorEstavel = 0;
    }
    ultimaLeitura = tempBruta;

    estabilizado = (contadorEstavel >= AMOSTRAS_ESTAVEIS);

    Serial.print("Bruta: ");
    Serial.print(tempBruta, 2);
    Serial.print(" C | Calibrada: ");
    Serial.print(tempCalibrada, 2);
    Serial.print(" C | ");

    if (estabilizado) {
      Serial.println("ESTAVEL - leitura valida para registro");
    } else {
      Serial.print("estabilizando... (");
      Serial.print(contadorEstavel);
      Serial.print("/");
      Serial.print(AMOSTRAS_ESTAVEIS);
      Serial.println(")");
    }
  }
}