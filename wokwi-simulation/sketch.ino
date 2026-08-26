/* ==============================================================================
 * Este sketch é uma versão simplificada, criada EXCLUSIVAMENTE para validar
 * a fiação e a lógica de leitura do sensor de temperatura DS18B20 em
 * conjunto com o acionamento dos LEDs indicadores.
 * 
 * Este NÃO é o código final do sistema.
 * 
 * Para acessar o projeto completo, documentação e outras integrações, visite:
 * -> https://github.com/raphaellyzzz/iomt-telemed-esp32.git
 * ============================================================================== */

#include <OneWire.h>
#include <DallasTemperature.h>

#define PIN_TEMP 4
#define PIN_LED_GREEN 18
#define PIN_LED_YELLOW 19
#define PIN_LED_RED 23

#define OFFSET_CALIBRACAO 1.57
#define LIMIAR_ESTAVEL 0.10f
#define AMOSTRAS_ESTAVEIS 5
#define TEMP_CYCLE_MS 2000UL

OneWire oneWire(PIN_TEMP);
DallasTemperature tempSensor(&oneWire);

float ultimaLeituraBruta = NAN;
int contadorEstavel = 0;
bool tempEstabilizada = false;
float tempCalibradaAtual = NAN;
bool conversaoEmAndamento = false;
unsigned long lastTempRequest = 0;

void atualizarDS18B20() {
  unsigned long agora = millis();

  if (!conversaoEmAndamento && (agora - lastTempRequest >= TEMP_CYCLE_MS)) {
    tempSensor.requestTemperatures();
    conversaoEmAndamento = true;
    lastTempRequest = agora;
    return;
  }

  if (!conversaoEmAndamento || !tempSensor.isConversionComplete()) return;

  conversaoEmAndamento = false;
  float bruta = tempSensor.getTempCByIndex(0);

  if (bruta == DEVICE_DISCONNECTED_C) {
    Serial.println("[DS18B20] ERRO: sensor desconectado.");
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
    tempCalibradaAtual = calibrada;
  }

  Serial.print("[DS18B20] Bruta: "); Serial.print(bruta, 2);
  Serial.print(" C | Calibrada: "); Serial.print(calibrada, 2);
  Serial.print(" C | ");
  Serial.println(tempEstabilizada ? "ESTAVEL" : "estabilizando...");
}

void atualizarLEDs() {
  digitalWrite(PIN_LED_GREEN, LOW);
  digitalWrite(PIN_LED_YELLOW, LOW);
  digitalWrite(PIN_LED_RED, LOW);

  if (isnan(tempCalibradaAtual)) return; 

  /* 
   * Lógica alinhada com o calcular_risco_news2 do código original:
   * <= 35.0 ou >= 39.1      -> Vermelho (Risco - Score 3 ou 2)
   * 35.1 a 36.0 ou 38.1 a 39.0 -> Amarelo (Atenção - Score 1)
   * 36.1 a 38.0             -> Verde (Normal - Score 0)
   */
   
  if (tempCalibradaAtual <= 35.0 || tempCalibradaAtual > 39.0) {
    digitalWrite(PIN_LED_RED, HIGH);
  } 
  else if ((tempCalibradaAtual > 35.0 && tempCalibradaAtual <= 36.0) || (tempCalibradaAtual > 38.0 && tempCalibradaAtual <= 39.0)) {
    digitalWrite(PIN_LED_YELLOW, HIGH);
  } 
  else {
    digitalWrite(PIN_LED_GREEN, HIGH);
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("TESTE WOKWI: DS18B20 + LEDs");

  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_LED_YELLOW, OUTPUT);
  pinMode(PIN_LED_RED, OUTPUT);

  tempSensor.begin();
  tempSensor.setWaitForConversion(false);

  int qtd = tempSensor.getDeviceCount();
  Serial.print("DS18B20 encontrados: ");
  Serial.println(qtd);
}

void loop() {
  atualizarDS18B20();
  atualizarLEDs();
}