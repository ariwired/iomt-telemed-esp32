# Sistema Híbrido de Monitoramento Remoto com Predição de Risco e Fog Computing

Este repositório contém o ecossistema completo de um sistema de telemedicina e IoMT (Internet of Medical Things) voltado para o acompanhamento de pacientes pós-operatórios em suas residências. O objetivo principal é mitigar os custos de deslocamento e garantir a continuidade do monitoramento mesmo sob instabilidades de conexão com a internet.

A arquitetura do projeto substitui a dependência 100% em Nuvem por uma abordagem de **Fog Computing**, onde a análise preliminar dos dados é realizada localmente. Além disso, o sistema utiliza modelos de **Machine Learning** para prever riscos clínicos de forma dinâmica, superando as limitações dos alertas baseados em limites fixos e estáticos.

Feito com um dashboard em React para visualização das métricas do paciente.

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

## Sinais Monitorados e Hardware

O sistema utiliza fusão de sensores para extrair um panorama clínico preciso do paciente:

### Sensores e Micro controlador
- Microcontrolador: ESP-32 ISM 2.4G 802.11/b/g/n
- Sensor de Oximetria e Frequência Cardíaca: MAX30102 
- Sensor de Temperatura Corporal: DS18B20 (Versão Impermeável)

**LEDs**
- 1x LED Vermelho 
- 1x LED Amarelo 
- 1x LED Verde


---
