# iomt-telemed-esp32

Este repositório contém o código-fonte embarcado (Edge Computing) do nó sensor de um **Sistema Híbrido de Monitoramento Remoto** voltado para pacientes pós-operatórios. 

Desenvolvido para microcontroladores ESP32, este módulo é responsável pela aquisição de sinais vitais, aplicação de filtros digitais locais e transmissão de dados formatados para um nó *Fog* via protocolo MQTT.

## Objetivo da Camada Edge
Em sistemas de telemedicina tradicionais dependentes exclusivamente de *Cloud*, falhas de rede interrompem o monitoramento. Este módulo resolve esse problema atuando na borda: ele coleta, limpa e realiza uma pré-avaliação do risco do paciente localmente, disparando alarmes físicos em caso de emergência, mesmo offline.

## Principais Funcionalidades
* **Aquisição Hard-Real Time:** Leitura contínua de Saturação de Oxigênio (SpO2), Frequência Cardíaca (FC) e Temperatura corporal.
* **Filtro Digital Local:** Implementação de Filtro de Média Móvel para suavizar ruídos de movimentação do paciente antes da transmissão, otimizando banda e processamento no back-end.
* **Avaliação de Risco Local:** Algoritmo determinístico baseado em pesos (SpO2: 50%, FC: 30%, Temp: 20%) para classificar o estado do paciente (NORMAL, ATENÇÃO, ALERTA, CRÍTICO).
* **Atuadores Físicos:** Acionamento de LEDs RGB e Buzzer para alertas visuais e sonoros imediatos no ambiente físico.
* **Gateway MQTT:** Formatação e publicação dos dados limpos em tópicos MQTT para consumo por serviços de mensageria na camada *Fog/Cloud*.

## Hardware Utilizado
* Microcontrolador **ESP32** (NodeMCU/WROOM-32)
* Sensor de Oximetria/Frequência: **MAX30102**
* Sensor de Temperatura: **DS18B20**
* Componentes de saída: LED RGB, Buzzer e resistores.

## Integração com Inteligência Artificial
Os payloads contínuos gerados por este microcontrolador são ingeridos por uma API de Back-End, onde modelos preditivos de **Machine Learning** processam a série temporal dos sinais vitais. O objetivo da integração com a IA é:

* **Análise Preditiva de Tendências:** Identificar padrões de degradação clínica (como uma queda sutil, mas constante, na SpO2 associada à taquicardia) e alertar a equipe médica *antes* que o paciente atinja um estado de emergência.
* **Fim dos Limites Estáticos:** Substituir alarmes tradicionais por algoritmos treinados que compreendem o padrão basal fisiológico de cada paciente.
* **Mitigação de Falsos Alarmes:** Cruzar os dados vitais filtrados pela borda para garantir que notificações enviadas à equipe de saúde tenham alta precisão e relevância clínica.
