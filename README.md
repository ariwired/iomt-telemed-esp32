# IoMT Telemed: Monitorização Preditiva com Edge & Fog Computing

![Spring Boot](https://img.shields.io/badge/Spring_Boot-F2F4F9?style=for-the-badge&logo=spring-boot)
![Docker](https://img.shields.io/badge/Docker-2CA5E0?style=for-the-badge&logo=docker&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![MQTT](https://img.shields.io/badge/MQTT-660066?style=for-the-badge&logo=mqtt&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![C++](https://img.shields.io/badge/C++-00599C?style=for-the-badge&logo=c%2B%2B&logoColor=white)

Um sistema de Internet of Medical Things (IoMT) desenhado para a verificação de sinais vitais em tempo real, utilizando arquitetura distribuída (Edge e Fog Computing) e Machine Learning para classificação preditiva de risco.

---

## Arquitetura do Sistema

O projeto foi construído com foco na resiliência e baixa latência, dividindo a carga de processamento em diferentes camadas:

1. **Hardware:** Microcontrolador ESP32 equipado com sensores MAX30102 e DS18B20. Possui lógica de *fallback* médico implementada em C++ para acionamento de alertas visuais (LEDs) imediatos em caso de sinais críticos, garantindo segurança mesmo em falhas de rede.
2. **Fog Computing:** Broker Eclipse Mosquitto orquestrando a mensageria MQTT (`hospital/fog/monitoramento`) para garantir uma ingestão de dados leve e assíncrona.
3. **Back-End:** API em Java (Spring Boot) que consome os dados do MQTT, realiza a persistência num banco de dados PostgreSQL e gere tarefas agendadas.
4. **Machine Learning:** Microsserviço Python (FastAPI) que aplica um modelo de *Random Forest* às amostras vitais, devolvendo um *Risk Score* e *Risk Level* atualizado.
5. **Front-End:** Dashboard interativo em React que consome os dados processados e exibe o estado do paciente em tempo real.

---

## Protótipo Interativo 

Para testar a lógica da camada de borda (Edge) sem a necessidade do hardware físico, uma simulação exata do circuito está disponível no Wokwi. Como a plataforma web não simula nativamente sensores biomédicos, o sinal de oximetria é emulado via potenciômetro para validação dos filtros e alarmes.

🔗 **[Acessar Simulação ao Vivo no Wokwi](https://wokwi.com/projects/459458836238337025)**

### Como testar na simulação:
1. Inicie a execução do simulador no navegador.
2. Altere o slider do sensor de temperatura ou reduza o valor do potenciômetro de SpO2 para menos de 90%.
3. Observe os **LEDs indicadores** mudando de estado e o **Buzzer** disparando o alarme sonoro instantaneamente.
4. Abra o *Serial Monitor* para acompanhar as mensagens JSON sendo geradas e publicadas nos tópicos MQTT do nó Fog.

---

## Stack Tecnológico

* **Firmware:** C++ (PlatformIO), bibliotecas DallasTemperature e MAX30105.
* **Back-End:** Java 17, Spring Boot 3.2.4, Spring Data JPA, Spring Integration MQTT.
* **Inteligência Artificial:** Python, FastAPI, Scikit-Learn (Random Forest).
* **Base de Dados:** PostgreSQL 15.
* **DevOps:** Docker e Docker Compose.

---

## Como Executar o Projeto?

A infraestrutura está conteinerizada, garantindo execução em qualquer ambiente.

### 1. Preparação (Firmware)
* Altere o ficheiro `firmware/config.example.h` para `config.h`.
* Insera as credenciais da rede Wi-Fi e o IP da máquina onde o servidor Docker será executado.

### 2. Subir a Infraestrutura (Docker)
Na raiz do projeto, execute:
```bash
docker compose up --build -d
```

Este comando irá inicializar 5 containers: 
**iomt_postgres, iomt_fog_broker, iomt_ml_api, iomt_backend_api, iomt_frontend_dashboard**.

### 3. Acesso
Acesse ao Dashboard em: http://localhost
