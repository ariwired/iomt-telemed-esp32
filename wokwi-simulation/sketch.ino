#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <OneWire.h>
#include <DallasTemperature.h>

#define PIN_LED_GREEN 25
#define PIN_LED_YELLOW 26
#define PIN_LED_RED 27
#define PIN_TEMP 4
#define PIN_MOCK_SPO2 34

LiquidCrystal_I2C lcd(0x27, 16, 2);
Adafruit_MPU6050 mpu;
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

  Wire.begin(21, 22);
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0,0);
  lcd.print("Iniciando Sist.");
  
  if (!mpu.begin()) {
    Serial.println("Falha ao encontrar MPU6050");
  }
  
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
    if (client.connect("ESP32_MedicalNode_01")) {
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

void updateAlerts(float temp, int spo2_simulado) {
  digitalWrite(PIN_LED_GREEN, LOW);
  digitalWrite(PIN_LED_YELLOW, LOW);
  digitalWrite(PIN_LED_RED, LOW);

  // lógica de alerta puramente visual
  if (spo2_simulado < 90 || temp > 38.5) {
    digitalWrite(PIN_LED_RED, HIGH);
  } else if (spo2_simulado < 95 || temp > 37.5) {
    digitalWrite(PIN_LED_YELLOW, HIGH);
  } else {
    digitalWrite(PIN_LED_GREEN, HIGH);
  }
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  tempSensor.requestTemperatures();
  float tempC = tempSensor.getTempCByIndex(0);
  
  int rawSpO2 = analogRead(PIN_MOCK_SPO2); //aqui entraria a leitura I2C do MAX30102
  
  averageSpO2Raw = applyEdgeFilter(rawSpO2);
  int spo2_percentage = map(averageSpO2Raw, 0, 4095, 80, 100); 

  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);

  updateAlerts(tempC, spo2_percentage); //alerta Local

  lcd.clear();
  lcd.setCursor(0,0);
  lcd.print("SpO2: "); lcd.print(spo2_percentage); lcd.print("%");
  lcd.setCursor(0,1);
  lcd.print("Temp: "); lcd.print(tempC); lcd.print("C");

  String payload = "{";
  payload += "\"paciente_id\": \"12345\",";
  payload += "\"spo2\": " + String(spo2_percentage) + ",";
  payload += "\"temp\": " + String(tempC) + ",";
  payload += "\"accel_z\": " + String(a.acceleration.z);
  payload += "}";

  client.publish("hospital/fog/monitoramento", payload.c_str());
  Serial.println("Publicado: " + payload);

  delay(2000);
}