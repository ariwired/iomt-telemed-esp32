# Sistema Híbrido de Monitoramento Remoto com Predição de Risco e Fog Computing

Este repositório contém o ecossistema completo de um sistema de telemedicina e IoMT (Internet of Medical Things) voltado para o acompanhamento de pacientes pós-operatórios em suas residências. O objetivo principal é mitigar os custos de deslocamento e garantir a continuidade do monitoramento mesmo sob instabilidades de conexão com a internet.

A arquitetura do projeto substitui a dependência 100% em Nuvem por uma abordagem de **Fog Computing**, onde a análise preliminar dos dados é realizada localmente. Além disso, o sistema utiliza modelos de **Machine Learning** para prever riscos clínicos de forma dinâmica, superando as limitações dos alertas baseados em limites fixos e estáticos.

---

## Estrutura do Repositório

*   `firmware/`: Código fonte em C++/Arduino desenvolvido no **PlatformIO** para o ESP32. Responsável pela aquisição, filtragem (Edge) e publicação via MQTT.
*   `backend/`: API estruturada para ingestão do histórico de dados, execução dos modelos de IA/Deep Learning e orquestração via contêineres Docker.
*   `frontend/`: Aplicação web gamificada que incentiva o paciente a registrar sintomas diariamente através de dinâmicas de engajamento e aprendizagem.
*   `wokwi-simulation/`: Arquivos da simulação interativa de hardware para validação rápida no navegador.
*   `docs/`: Diagramas e recursos visuais da arquitetura do sistema.

```bash
IOMT-TELEMED-ESP32/
│
├── .gitignore                  
├── README.md                   
├── docker-compose.yml
│
├── api/                        # API Spring Boot + Modelos de ML + Docker
│   ├── src/                    
│   └── Dockerfile
├── docs/                       # Documentação e diagramas de arquitetura
├── firmware/                   # Código C++ do ESP32 (PlatformIO)
├── frontend/                   # Interface Dashboard
└── wokwi-simulation/           # Sandbox para simulação rápida no navegador
```


---

## Fluxo de Funcionamento e Arquitetura

1.  **Aquisição (Hard-Real Time):** O microcontrolador ESP32 realiza a leitura contínua dos sensores conectados ao paciente.
2.  **Tratamento de Sinal (Edge):** Filtros digitais são aplicados diretamente no C++ do ESP32 para limpar ruídos de movimento do paciente, otimizando o consumo de banda de rede.
3.  **Transmissão Local (Fog):** O ESP32 envia as informações estruturadas em JSON via Wi-Fi (protocolo MQTT) para um gateway de processamento local (Fog) na residência do paciente, garantindo que o fluxo de dados funcione mesmo sem internet.
4.  **Inteligência Preditiva (Back-End):** O servidor consome a série temporal e utiliza modelos treinados de Machine Learning para analisar as curvas dos sinais vitais em tempo real, prevendo riscos iminentes e gerando alertas otimizados para a família e a rede médica.
5.  **Ação de Alerta Local:** Em cenários de risco detectados, o próprio firmware aciona atuadores sonoros e visuais no ambiente físico de forma imediata.

---

## Protótipo Interativo (Hardware Sandbox)

Para testar a lógica da camada de borda (Edge) sem a necessidade do hardware físico, uma simulação exata do circuito está disponível no Wokwi. Como a plataforma web não simula nativamente sensores biomédicos, o sinal de oximetria é emulado via potenciômetro para validação dos filtros e alarmes.

🔗 **[Acessar Simulação ao Vivo no Wokwi](INSIRA_O_SEU_LINK_AQUI)**

### Como testar na simulação:
1. Inicie a execução do simulador no navegador.
2. Altere o slider do sensor de temperatura ou reduza o valor do potenciômetro de SpO2 para menos de 90%.
3. Observe os **LEDs indicadores** mudando de estado e o **Buzzer** disparando o alarme sonoro instantaneamente.
4. Abra o *Serial Monitor* para acompanhar as mensagens JSON sendo geradas e publicadas nos tópicos MQTT do nó Fog.

---

## Sinais Monitorados e Hardware

O sistema utiliza fusão de sensores para extrair um panorama clínico preciso do paciente:

*   **Saturação de Oxigênio (SpO2) e Frequência Cardíaca:** Sensor de fotopletismografia (PPG) **MAX30102**.
*   **Temperatura Corporal:** Sensor **DS18B20** (Versão impermeável).
*   **Cinemática e Movimentação:** Acelerômetro e Giroscópio **MPU6050** (Útil para mapear repouso ou identificar quedas).
*   **Interface Física Local:** Display LCD 16x2 com interface I2C para exibição direta dos sinais à beira do leito.
*   **Indicadores de Alerta:** LEDs (Verde, Amarelo, Vermelho).

---
