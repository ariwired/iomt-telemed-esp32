#include <WiFi.h>
#include <PubSubClient.h>
#include <OneWire.h>
#include <DallasTemperature.h>

#define PIN_LED_GREEN 25
#define PIN_LED_YELLOW 26
#define PIN_LED_RED 27
#define PIN_TEMP 4
#define PIN_MOCK_SPO2 34

OneWire oneWire(PIN_TEMP);
DallasTemperature tempSensor(&oneWire);

const char* ssid = "Wokwi-GUEST";
const char* password = "";
const char* mqtt_server = "broker.hivemq.com"; 

WiFiClient espClient;
PubSubClient client(espClient);

const int numReadings = 5;
int readings[numReadings];      
int readIndex = 0;              
int total = 0;                  
int averageSpO2Raw = 0;

void setup() {
  Serial.begin(115200);
  
  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_LED_YELLOW, OUTPUT);
  pinMode(PIN_LED_RED, OUTPUT);

  for (int i = 0; i < numReadings; i++) readings[i] = 0;

  Serial.println("Iniciando Sistema IoMT...");
  tempSensor.begin();

  setup_wifi();
  client.setServer(mqtt_server, 1883);
}

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Conectando a ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("WiFi conectado");
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Tentando conexao MQTT...");
    String clientId = "ESP32_MedicalNode_" + String(random(0xffff), HEX);
    if (client.connect(clientId.c_str())) {
      Serial.println("conectado");
    } else {
      Serial.print("falhou, rc=");
      Serial.print(client.state());
      delay(2000);
    }
  }
}

int applyEdgeFilter(int newValue) {
  total = total - readings[readIndex];
  readings[readIndex] = newValue;
  total = total + readings[readIndex];
  readIndex = readIndex + 1;
  if (readIndex >= numReadings) readIndex = 0;
  return total / numReadings;
}

void updateAlerts(float temp, int spo2_simulado, int fc_simulado) {
  digitalWrite(PIN_LED_GREEN, LOW);
  digitalWrite(PIN_LED_YELLOW, LOW);
  digitalWrite(PIN_LED_RED, LOW);

  // Critérios de Risco:
  // Vermelho: SpO2 < 90 OU Temp > 38.5 OU FC > 115 (Crítico)
  // Amarelo: SpO2 < 94 OU Temp > 37.5 OU FC > 100 (Atenção)
  // Verde: Tudo normal

  if (spo2_simulado < 90 || temp > 38.5 || fc_simulado > 115) {
    digitalWrite(PIN_LED_RED, HIGH);
  } else if (spo2_simulado < 94 || temp > 37.5 || fc_simulado > 100) {
    digitalWrite(PIN_LED_YELLOW, HIGH);
  } else {
    digitalWrite(PIN_LED_GREEN, HIGH);
  }
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  tempSensor.requestTemperatures();
  float temp = tempSensor.getTempCByIndex(0);
  
  //lê o potenciômetro para simular a saturação
  int rawSpO2 = analogRead(PIN_MOCK_SPO2); 
  averageSpO2Raw = applyEdgeFilter(rawSpO2);

  //converte a leitura (0-4095) para porcentagem (80% a 100%)
  int spo2_simulado = map(averageSpO2Raw, 0, 4095, 80, 100); 

  // Taquicardia
  int fc_simulado = random(110, 125);

  updateAlerts(temp, spo2_simulado, fc_simulado);

  Serial.print("Leitura Local -> SpO2: ");
  Serial.print(spo2_simulado);
  Serial.print("% | FC: ");
  Serial.print(fc_simulado);
  Serial.print(" bpm | Temp: ");
  Serial.print(temp);
  Serial.println("C");

  String payload = "{";
  payload += "\"paciente_id\": \"CRITICO_02\",";
  payload += "\"spo2\": " + String(spo2_simulado) + ",";
  payload += "\"fc\": " + String(fc_simulado) + ","; 
  payload += "\"temp\": " + String(temp);
  payload += "}";

  client.publish("hospital/fog/monitoramento", payload.c_str());
  Serial.println("Enviado para a Nuvem: " + payload);
  Serial.println("-----------------------------------");

  delay(2000); 
}