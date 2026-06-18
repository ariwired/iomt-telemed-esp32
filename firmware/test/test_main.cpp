#include <Arduino.h>
#include <unity.h>
#include "config.h"

// Teste 1: Verifica se os pinos dos LEDs estão definidos corretamente
void test_led_pins_configuration(void) {
    TEST_ASSERT_EQUAL(25, PIN_LED_GREEN);
    TEST_ASSERT_EQUAL(26, PIN_LED_YELLOW);
    TEST_ASSERT_EQUAL(27, PIN_LED_RED);
}

// Teste 2: Verifica se o ID do paciente é válido (não vazio e diferente de um valor genérico)
void test_paciente_id_is_valid(void) {
    String id = String(PACIENTE_ID);
    TEST_ASSERT_TRUE(id.length() > 0);
    TEST_ASSERT_NOT_EQUAL("12345", PACIENTE_ID); 
}

void setup() {
    delay(2000);
    UNITY_BEGIN();

    RUN_TEST(test_led_pins_configuration);
    RUN_TEST(test_paciente_id_is_valid);

    UNITY_END();
}

void loop() {
    
}