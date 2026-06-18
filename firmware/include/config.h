#ifndef CONFIG_H
#define CONFIG_H

// ==========================================
// CONFIGURAÇÕES DE HARDWARE (PINAGEM)
// ==========================================
#define PIN_LED_GREEN 25
#define PIN_LED_YELLOW 26
#define PIN_LED_RED 27
#define PIN_TEMP 4

#define WIFI_SSID "ari" // Nome da Rede WiFi
#define WIFI_PASSWORD "12345678mn" // Senha da Rede WiFi

#define MQTT_SERVER "192.168.18.52" // IP do Mosquitto Local
#define MQTT_PORT 1883
#define MQTT_TOPIC "hospital/fog/monitoramento"
#define MQTT_CLIENT_ID "ESP32_MedicalNode_01"

#define PACIENTE_ID "COLEGA_01" // ID do Paciente Físico

#endif