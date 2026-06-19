# DOC_DS18B20 — Teste Preliminar de Sensor de Temperatura

## 1. Objetivo do teste

Validar de forma **isolada** o sensor de temperatura DS18B20 antes da integração com o restante do sistema. O teste cobre três frentes:

1. Detecção do sensor no barramento OneWire (hardware/fiação ok).
2. Estabilidade da leitura ao longo do tempo.
3. Aplicação de um offset de calibração para aproximar a leitura de superfície da temperatura corporal central.

**Status:** 
- Sensor detectado e lendo de forma consistente. 

- Calibração com termômetro de referência pendente (planejada para o dia seguinte ao deste teste).

---

## 2. Por que essa abordagem é necessária

### 2.1 O sensor mede temperatura de contato, não temperatura central

O DS18B20 é um sensor de contato direto. Quando colocado contra a pele, ele não mede a temperatura corporal central (a que define febre clinicamente), ou seja ele mede a temperatura da superfície da pele, que é sistematicamente mais baixa, porque a pele troca calor com o ambiente continuamente (convecção, evaporação, exposição ao ar).

Esse comportamento foi observado diretamente no teste: ao tocar o sensor, a leitura partiu da temperatura ambiente (~25,5 °C) e subiu gradualmente até estabilizar. O sensor estava absorvendo calor do ponto de contato até atingir equilíbrio térmico. Esse padrão de subida é esperado e **não indica erro de calibração ou defeito do sensor**.

### 2.2 O que a literatura faz para lidar com isso

Trabalhos que aplicam DS18B20 a monitoramento de temperatura corporal (vestíveis, telemedicina) tratam o sensor como dispositivo de contato contínuo, não de leitura pontual instantânea:

- O protótipo de monitoramento de saúde baseado em DS18B20 e Arduino, publicado na SN Computer Science (Springer), descreve um sistema de monitoramento em tempo real baseado em sensores wearable popularizado pela ascensão da internet das coisas, no qual o sensor é fixado ao corpo do paciente de forma contínua, como parte de um sistema mais amplo de coleta de sinais vitais (2).

- Um estudo de validação metrológica do DS18B20 testou diferentes modelos de correção (offset simples, linear afim, polinomial, segmentado) contra uma referência de Pt-100, e concluiu que o modelo afim linear especifico por sensor ofereceu o melhor equilíbrio geral, reduzindo o erro médio absoluto para a faixa de 0,046 a 0,130 °C. Isso confirma duas coisas relevantes para o projeto:

1. calibração individual por sensor é prática estabelecida 
2. mesmo um offset simples já traz ganho relevante de precisão em relação ao valor bruto.

O estudo também conclui que os resultados apoiam o uso de sensores DS18B20 calibrados individualmente para monitoramento contínuo, desde que a faixa de operação efetiva seja mantida. (1)

- Um estudo comparativo entre sensores de temperatura (DHT11, DHT22, DS18B20) calibrados em laboratório certificado constatou que, entre os três, o DS18B20 apresentou a menor incerteza (0,17 °C) e a maior precisão entre os sensores testados (99,05%) reforçando a escolha do componente para esta aplicação, se devidamente calibrado. (3)

**Conclusão aplicada ao projeto:** a estratégia adotada (offset de calibração + exigência de estabilização térmica antes de aceitar a leitura) está alinhada com a prática documentada na literatura para esse tipo de sensor em aplicações de monitoramento de saúde.

---

## 3. O que o firmware de teste faz

Arquivo: `/iomt-telemed-esp32/firmware/src_tests/dsb_teste/main.cpp` (teste isolado, sem WiFi/MQTT/MAX30102/LEDs).

### 3.1 Detecção do sensor
No `setup()`, o firmware consulta `tempSensor.getDeviceCount()` para confirmar que o DS18B20 foi corretamente identificado no barramento OneWire (GPIO4). Se `0`, indica problema de fiação (VCC, GND, DATA ou resistor de pull-up).

### 3.2 Leitura bruta e tratamento de erros
A cada 2 segundos, o firmware solicita uma nova leitura (`requestTemperatures()`) e trata dois casos de erro conhecidos da biblioteca DallasTemperature:
- `-127 °C` → sensor desconectado durante a leitura.
- `85.0 °C` → valor de power-on-reset do chip, indica que o sensor não respondeu a tempo (geralmente pull-up ausente ou fiação instável).

### 3.3 Offset de calibração
```cpp
#define OFFSET_CALIBRACAO 4.7
float tempCalibrada = tempBruta + OFFSET_CALIBRACAO;
```
O valor `4.7` é um **placeholder**. Ele precisa ser substituído pelo offset real, calculado assim:

```
offset = temperatura_referencia − temperatura_DS18B20_estabilizada
```

Onde `temperatura_referencia` é medida com um termômetro axilar **no mesmo ponto de contato, na mesma pessoa, no mesmo instante** em que o DS18B20 estabiliza. Essa etapa está pendente por enquanto.

> Nota técnica: este é um offset fixo (aditivo), não uma regressão linear. Funciona bem desde que a calibração e o uso futuro ocorram sempre na mesma região do corpo e em condições semelhantes. Se for necessária maior precisão, o offset pode evoluir para um modelo afim linear (`a · temp + b`), calibrado com 2 ou mais pontos de referência — abordagem usada no estudo metrológico citado na seção 2.2.

### 3.4 Detecção de estabilização
```cpp
#define LIMIAR_ESTAVEL 0.10f
#define AMOSTRAS_ESTAVEIS 5
```
O firmware só marca uma leitura como `ESTAVEL` quando a variação entre leituras consecutivas é menor que `0.10 °C` por `5` leituras seguidas (~10 segundos de contato contínuo). Isso evita que o pipeline de ML e fog receba dados da fase de aquecimento do sensor (não representativos), aceitando apenas leituras já em equilíbrio térmico com o ponto de contato.

---

## 4. Resultado do teste preliminar

```
Sensores DS18B20 encontrados no barramento: 1
Sensor encontrado. Iniciando leituras...
Offset de calibracao aplicado: +4.70

Bruta: 33.81 C | Calibrada: 38.51 C | estabilizando... (0/5)
...
Bruta: 34.00 C | Calibrada: 38.70 C | ESTAVEL - leitura valida para registro
...
Bruta: 34.06 C | Calibrada: 38.76 C | ESTAVEL - leitura valida para registro
```

**Leitura:**
- O sensor foi detectado corretamente (1 dispositivo no barramento).
- Não houve erros de desconexão (-127) nem leituras suspeitas (85.0) durante o teste.
- A leitura bruta estabilizou na faixa de 33,8–34,2 °C, dentro de ~5 ciclos de leitura (~10 s) — comportamento esperado de equilíbrio térmico por contato.
- O offset aplicado (`+4.7`, placeholder) resultou em valores calibrados na faixa de 38,5–38,9 °C

---

## 5. Pendência e próximo passo

- [ ] Medir simultaneamente, no mesmo ponto de contato: referência vs. DS18B20 estabilizado.
- [ ] Recalcular `OFFSET_CALIBRACAO` com o valor real.
- [ ] Verificar se quiser modelo linear: Repetir a medição em 2–3 temperaturas diferentes.

---

## 6. Referências

1. Rodríguez-Rama, J. A., Presa Madrigal, L., Marín Lázaro, A., Maroto Lorenzo, J., García Laso, A., Costafreda Mustelier, J. L., & Martín-Sánchez, D. A. (2026). Metrological Validation of Low-Cost DS18B20 Digital Temperature Sensors Using the TH-001 Procedure: Calibration Models, Uncertainty, and Reproducibility. Metrology, 6(1), 21. https://doi.org/10.3390/metrology6010021 
2. Ramesh Saha, Biswas S, Sarmah S, Karmakar S, Das P. A Working Prototype Using DS18B20 Temperature Sensor and Arduino for Health Monitoring. SN Comput Sci. 2021;2(1):33. doi: 10.1007/s42979-020-00434-2. Epub 2021 Jan 12. PMID: 33458699; PMCID: PMC7802410.
3. Yulizar, David & Soekirno, Santoso & Ananda, Naufal & Prabowo, Muhammad Agung & Perdana, Ilham & Aofany, Diar. (2023). Performance Analysis Comparison of DHT11, DHT22 and DS18B20 as Temperature Measurement. 10.2991/978-94-6463-232-3_5. 