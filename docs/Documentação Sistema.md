# Sistema Híbrido de Monitoramento Remoto com Predição de Risco e Fog Computing
---

## 1. Introdução e motivação

Pacientes em fase pós-operatória frequentemente enfrentam dificuldades significativas para realizar consultas de acompanhamento, especialmente quando a mobilidade está reduzida ou quando o deslocamento até a unidade de saúde representa um custo financeiro e logístico relevante para o paciente e sua família. Sistemas tradicionais de telemedicina endereçam parcialmente esse problema, mas a maioria depende de conectividade constante e ininterrupta com a nuvem para qualquer tipo de processamento ou alerta, o que os torna vulneráveis a quedas de conexão.

Este projeto propõe uma arquitetura híbrida de monitoramento remoto que combina três elementos: 
- Computação em névoa (Fog Computing) processando os dados localmente antes de depender da nuvem; 
- Um modelo de aprendizado de máquina para classificação de risco clínico, superando a limitação dos alertas tradicionais baseados em limiares fixos e estáticos; 
- Hardware embarcado de baixo custo (ESP32 com sensores biomédicos) para aquisição contínua dos sinais vitais do paciente.

O sistema foi implementado como uma prova de conceito funcional, com cada camada da arquitetura operando de ponta a ponta: aquisição de sinais vitais reais via sensores MAX30102 (oximetria e frequência cardíaca) e DS18B20 (temperatura corporal), transmissão via protocolo MQTT para um nó de processamento local, persistência em banco de dados relacional, inferência por um modelo de Random Forest treinado, e visualização em um dashboard web.

---

## 2. Arquitetura geral do sistema

A arquitetura é dividida em cinco camadas independentes, cada uma em seu próprio container Docker, comunicando-se através de uma rede interna definida no `docker-compose.yml.` Essa separação permite que cada componente seja desenvolvido, testado e escalado de forma isolada.

### 2.1 Visão geral das camadas

| Camada         | Tecnologia                  | Responsabilidade                                   | Porta |
| -------------- | --------------------------- | -------------------------------------------------- | ----- |
| Firmware       | C++ / PlatformIO / ESP32    | Aquisição e filtragem de sinais, publicação MQTT   | —     |
| Fog node       | Eclipse Mosquitto 2         | Broker MQTT local, sem dependência de nuvem        | 1883  |
| API / Backend  | Spring Boot 3.2.4 / Java 17 | Consome MQTT, persiste dados, orquestra inferência | 8080  |
| ML API         | FastAPI / scikit-learn      | Classificação de risco via Random Forest           | 5000  |
| Banco de dados | PostgreSQL 15               | Persistência de pacientes e sinais vitais          | 5432  |
| Frontend       | React + Vite / Nginx        | Dashboard de visualização para a equipe clínica    | 80    |

### 2.2 Fluxo de dados

1. O ESP32 realiza a leitura contínua dos sensores MAX30102 (SpO2 e frequência cardíaca, via algoritmo de Maxim Integrated) e DS18B20 (temperatura corporal).
2. O firmware monta um payload JSON e publica via MQTT no tópico `hospital/fog/monitoramento`, endereçado ao broker Mosquitto rodando localmente (nó de névoa).
3. O backend Spring Boot, inscrito nesse tópico via Spring Integration MQTT, recebe a mensagem e a processa em `VitalSignService`.
4. Antes de salvar a leitura, o sistema garante a existência do paciente na tabela `patients`.
5. A leitura é persistida na tabela `vital_signs`, sem classificação de risco ainda.
6. A cada 30 segundos, um job agendado agrupa as leituras recentes por paciente, calcula médias de SpO2, frequência cardíaca e temperatura, e envia esses valores para o ml-api via requisição HTTP POST em `/predict`.
7. O ml-api carrega um modelo de Random Forest pré-treinado (scikit-learn) e retorna a classe de risco prevista (LOW, MEDIUM, HIGH ou CRITICAL) e o score de confiança da predição.
8. Caso a chamada ao ml-api falhe (timeout, indisponibilidade), o backend aciona um mecanismo de fallback local baseado em regras fixas (`PredictiveRiskService`), garantindo que o pipeline nunca trave por dependência de um serviço externo.
9. O resultado é gravado na última leitura do paciente e exposto via endpoint REST `GET /api/dashboard/patient/{id}`.
10. O frontend React consulta esse endpoint a cada 4 segundos (polling) e atualiza o dashboard com os sinais vitais, o nível de risco e o histórico recente.

### 2.3 Por que computação em névoa (fog computing) e não cloud-only?

A literatura recente em IoMT (Internet of Medical Things) tem investigado extensivamente arquiteturas híbridas fog-cloud como alternativa às arquiteturas tradicionais 100% centralizadas na nuvem. Estudos publicados em 2025 demonstram que arquiteturas híbridas fog-edge para monitoramento de saúde em tempo real podem melhorar a eficiência energética e economizar uma boa largura de banda quando comparadas a modelos cloud-only (1). Esse ganho ocorre porque o processamento preliminar dos dados é feito próximo à origem do dado, sem depender de uma viagem de ida e volta até um datacenter remoto.

No contexto específico deste projeto, o nó de névoa garante que a publicação e recepção inicial dos dados continue funcionando mesmo que a conexão com a internet seja interrompida. A camada de inteligência preditiva roda no mesmo host local via Docker, o que neste protótipo significa que toda a cadeia de decisão de risco funciona sem depender de internet externa, apenas da rede local onde o paciente está.

---

## 3. Hardware
### 3.1 Lista de componentes

| Componente               | Função no sistema                                             | Interface                |
| ------------------------ | ------------------------------------------------------------- | ------------------------ |
| ESP32 WROOM-32           | Microcontrolador principal, Wi-Fi 802.11 b/g/n                | —                        |
| MAX30102                 | Oximetria (SpO2) e frequência cardíaca via fotopletismografia | I2C (SDA/SCL)            |
| DS18B20 (à prova d'água) | Temperatura corporal                                          | OneWire (1 fio de dados) |
| LED vermelho             | Indicador visual de risco crítico                             | Digital (GPIO)           |
| LED amarelo              | Indicador visual de atenção                                   | Digital (GPIO)           |
| LED verde                | Indicador visual de normalidade                               | Digital (GPIO)           |
### 3.2 Diagrama de blocos do circuito

```
  [MAX30102] --I2C(SDA/SCL=21/22)--+
  [DS18B20]  --OneWire(GPIO4)------+--> [ESP32 WROOM-32] --Wi-Fi--> [Mosquitto/Fog]
  [LED verde]   <--GPIO25----------+
  [LED amarelo] <--GPIO26----------|
  [LED vermelho]<--GPIO27----------+
```

---

## 4. Firmware (ESP32 / C++ / PlatformIO)

### 4.1 Aquisição e filtragem de sinal (Edge)

O firmware utiliza a biblioteca SparkFun MAX3010x para comunicação com o MAX30102, preenchendo buffers de 100 amostras dos canais vermelho (Red) e infravermelho (IR) do sensor. Esses buffers são processados pela função `maxim_heart_rate_and_oxygen_saturation()`, parte do algoritmo de referência da Maxim Integrated, que calcula simultaneamente a saturação de oxigênio (SpO2) e a frequência cardíaca a partir da curva de fotopletismografia (PPG), retornando também flags de validade (`validSPO2`, `validHeartRate`) que indicam se a leitura teve qualidade suficiente para ser confiável.

A temperatura corporal é lida via protocolo OneWire do sensor DS18B20, com resolução de 12 bits por padrão da biblioteca DallasTemperature.

O uso de um microcontrolador ESP32 acoplado a sensores biomédicos de baixo custo para monitoramento de frequência cardíaca e oximetria está alinhado com implementações de referência amplamente documentadas pelo próprio fabricante do chip, que descreve a integração entre o ESP32 e o MAX30102 como uma combinação consolidada para projetos de monitoramento fisiológico embarcado (12).

### 4.2 Lógica de alerta local (updateAlerts)

O firmware aciona os três LEDs com base em limiares clínicos simples, fornecendo um feedback imediato e visual no próprio dispositivo, independente da disponibilidade de rede:

- Vermelho (crítico): SpO2 < 90% OU temperatura > 38,5°C
- Amarelo (atenção): SpO2 < 95% OU temperatura > 37,5°C
- Verde (normal): nenhuma das condições acima

### 4.3 Transmissão (Fog)

A cada 5 segundos após preencher o buffer de leitura, o firmware monta um payload JSON contendo `paciente_id`, `spo2`, `fc` (frequência cardíaca) e `temp`, publicando-o via PubSubClient no tópico MQTT `hospital/fog/monitoramento`. A conexão Wi-Fi e o endereço do broker MQTT (IP local) são definidos em `config.h`, exigindo reconfiguração quando o sistema muda de rede física.

---

## 5. Backend (Spring Boot)

### 5.1 Componentes principais

| Classe                  | Responsabilidade                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| `MqttConfig`            | Configura o canal de entrada MQTT (Spring Integration), inscrevendo-se no tópico de telemetria    |
| `VitalSignService`      | Processa e persiste a telemetria recebida; executa o job agendado de análise preditiva a cada 30s |
| `PatientService`        | Garante a existência do paciente (upsert automático) antes de persistir uma leitura               |
| `MlPredictionClient`    | Cliente HTTP (RestClient) para o ml-api, com timeout curto e tratamento de falhas via Optional    |
| `PredictiveRiskService` | Classificação de risco por regras fixas, usada como fallback quando o ml-api está indisponível    |
| `DashboardController`   | Expõe o endpoint REST consumido pelo frontend                                                     |
| `SecurityConfig`        | Define CORS e libera publicamente as rotas de dashboard                                           |
| `MlApiConfig`           | Configura o RestClient utilizado pelo MlPredictionClient para comunicação HTTP com o ml-api                                                                                                 |

### 5.2 Fallback de inferência

Um ponto de destaque arquitetural é o tratamento de falhas na chamada ao serviço de Machine Learning. Como o ml-api é um serviço externo (em outro container), sua indisponibilidade momentânea não pode comprometer a continuidade do pipeline de telemetria. O `MlPredictionClient` encapsula a chamada HTTP em um bloco try/catch, retornando `Optional.empty()` em caso de erro de comunicação (timeout, indisponibilidade). O `VitalSignService` trata a resposta em dois níveis: se o Optional está vazio, ou se o nível retornado pelo ml-api não puder ser parseado, o sistema recorre ao `PredictiveRiskService` como fallback. Dessa forma, toda leitura sempre recebe uma classificação de risco, independente do estado do serviço de ML.

---

## 6. Camada de Machine Learning

### 6.1 Modelo e features
O modelo foi treinado sobre dados sintéticos cujos rótulos foram gerados a partir de regras clínicas simplificadas. Dessa forma, o objetivo principal do Random Forest nesta prova de conceito não é superar clinicamente os limiares utilizados, mas validar a integração de uma camada de aprendizado de máquina dentro da arquitetura IoMT proposta.

Esse desenho reflete diretamente a literatura de escores de alerta precoce (Early Warning Scores, EWS) usados em ambientes hospitalares, nos quais múltiplos sinais vitais são combinados em uma pontuação de risco — mas, diferentemente dos EWS tradicionais (somas lineares fixas, como o NEWS — National Early Warning Score), o uso de um classificador treinado permite capturar interações não-lineares entre as variáveis.

### 6.2 Por que Random Forest

A escolha de Random Forest como classificador é diretamente sustentada por evidência da literatura clínica recente. Um estudo retrospectivo publicado por Pirneskoski et al. demonstrou que um modelo de Random Forest superou o National Early Warning Score (NEWS) tradicional na predição de mortalidade em 24 horas usando sinais vitais pré-hospitalares, analisando mais de 26 mil atendimentos de ambulância (2). De forma semelhante, um estudo de 2025 publicado na Scientific Reports comparou múltiplos algoritmos de ML para previsão de deterioração clínica e constatou que o Random Forest, junto ao Gradient Boosting, superou consistentemente os escores de alerta tradicionais baseados em regras fixas (3).

Esses estudos sustentam teoricamente a escolha de Random Forest como abordagem promissora para futuras versões do sistema. Ele é frequentemente preferido em aplicações clínicas por serem naturalmente interpretáveis através de importância de variáveis, permitindo que profissionais de saúde entendam quais sinais mais influenciaram uma classificação e não exige normalização extensiva dos dados de entrada, o que é vantajoso quando os sinais vêm de sensores de baixo custo com ruído inerente.

### 6.3 Limitações do modelo atual

- O modelo é treinado sobre dados sintéticos gerados artificialmente, não sobre dados clínicos reais. válido como prova de conceito da arquitetura, mas sem validade clínica para uso em pacientes reais.
- Não há validação cruzada k-fold nem métricas de AUROC/AUPRC documentadas formalmente, apenas a acurácia simples sobre um split de teste.
- O modelo não considera o histórico temporal do paciente (tendência de piora/melhora), avaliando apenas o estado pontual mais recente — uma limitação que a literatura de EWS contemporânea já identificou como relevante, já que modelos que incorporam séries temporais tendem a superar modelos que avaliam apenas snapshots.

---

## 7. Frontend (Dashboard)

O dashboard, construído em React com Vite, consome o endpoint de telemetria via polling a cada 4 segundos e apresenta: cartões de sinais vitais (`VitalCard`) com classificação individual de cada métrica, um banner de risco preditivo (`RiskBanner`) exibindo o nível e o score de confiança retornado pelo modelo, um gráfico de histórico (`HistoryChart`) e uma tabela de leituras recentes.

A aplicação trata estados de erro de forma explícita, incluindo o caso de paciente inexistente, com mensagem orientando que o paciente precisa ter ao menos uma leitura registrada antes de aparecer no dashboard, consequência direta do desenho atual de criação automática de pacientes a partir da primeira mensagem MQTT recebida.

---

## 8. Validação realizada

Antes da apresentação, o pipeline completo foi validado de ponta a ponta em ambiente local (Docker Compose), com os seguintes resultados:

- Compilação do backend (`mvn clean compile`): sucesso, 16 arquivos fonte compilados sem erros.
- Build e inicialização dos 5 containers (Postgres, Mosquitto, ml-api, API, frontend): todos os serviços subiram e permaneceram saudáveis (status Up).
- Publicação manual de uma mensagem MQTT de teste (paciente TESTE_01, SpO2 92%, FC 105 bpm, temperatura 37,8°C): o paciente foi criado automaticamente na tabela `patients`, a leitura foi persistida em `vital_signs`, e o job de análise preditiva classificou o risco como HIGH com score de confiança 0,6107 — um valor com múltiplas casas decimais, característico de uma predição real de `predict_proba` do scikit-learn (e não de uma regra fixa, que produziria valores arredondados), confirmando que a chamada ao ml-api funcionou corretamente.
- Endpoint REST (`GET /api/dashboard/patient/TESTE_01`) retornou o JSON esperado, consumido com sucesso pelo frontend.

---

## 9. Estado da arte

Esta seção situa o projeto dentro do panorama de pesquisa atual em IoMT (Internet of Medical Things), computação em névoa para saúde, e uso de aprendizado de máquina para predição de deterioração clínica.

### 9.1 Arquiteturas fog/edge para monitoramento remoto de pacientes

A adoção de arquiteturas híbridas fog-cloud em IoMT tem crescido significativamente na literatura de 2024-2025. Um framework recente propõe uma arquitetura de quatro camadas IoMT-Fog-Cloud na qual nós de névoa equipados com bancos de dados em grafo (em destaque o Neo4j) realizam processamento, filtragem e integração local de dados heterogêneos de saúde antes de transmiti-los à nuvem (4). Uma abordagem mais sofisticada que a deste projeto pois só é utilizado PostgreSQL relacional, mas que valida a mesma premissa arquitetural de pré-processamento local.

Outro framework relevante introduz uma camada adicional, denominada "roof computing", posicionada entre as camadas dew (orvalho, no próprio dispositivo do paciente) e fog, atuando como gateway intermediário para reforçar segurança e reduzir latência de comunicação; nesse cenário, sensores vestíveis enviam dados a um Arduino Uno local (camada dew) que valida rapidamente as leituras e gera alertas imediatos em caso de violação de limiar, replicando o mesmo padrão de alerta local-antes-da-nuvem implementado neste projeto através dos LEDs no ESP32 (5, 6).

NA arquitetura proposta adota o paradigma dew/fog computing, no qual parte do processamento é realizada próxima à fonte dos dados biomédicos, reduzindo latência e dependência de conectividade contínua com a nuvem. O uso de um microcontrolador ESP32 como nó de borda representa uma implementação prática desse conceito arquitetural descrito na literatura (5, 6).

Um estudo de 2025 propôs uma arquitetura híbrida fog-edge para monitoramento de saúde em tempo real, reportando melhorias significativas de latência, eficiência energética e uso de largura de banda (1). Essas métricas mostram quantitativamente a escolha arquitetural deste projeto, embora este protótipo não tenha medido formalmente esses ganhos ainda.

### 9.2 Machine learning para escores de alerta precoce

A limitação dos sistemas de alerta tradicionais baseados em limiares fixos, como o National Early Warning Score (NEWS), amplamente usado em hospitais, é um tema central na literatura de informática clínica. Diversos sistemas desses foram propostos para identificar deterioração clínica precoce em pacientes hospitalizados, incluindo abordagens tradicionais baseadas em regras e modelos mais recentes fundamentados em aprendizado de máquina (2, 3, 7, 8).

Pirneskoski et al. compararam diretamente um modelo de Random Forest contra o NEWS tradicional para predição de mortalidade em 24 horas usando sinais vitais pré-hospitalares coletados de mais de 26 mil atendimentos de ambulância na Finlândia (2008-2015), demonstrando superioridade do modelo de ML (2). Um estudo de 2024 publicado na BMJ Health & Care Informatics comparou modelos de ML contra o NEWS em um cenário de admissões de emergência, e um estudo de 2025 na Scientific Reports validou o uso de Gradient Boosting, Random Forest, regressão logística e redes Bayesianas contra dois escores clínicos estabelecidos (NEWS2 e DEPT) (3, 7).

Estudos recentes demonstram que abordagens baseadas em aprendizado de máquina, como o Mayo Clinic Early Warning Score (MC-EWS), podem aumentar a capacidade preditiva para deterioração clínica quando comparadas a métodos convencionais baseados exclusivamente em limiares fisiológicos (8).

Esse corpo de evidências sustenta diretamente a tese central deste projeto: substituir alertas por limiar fixo por um classificador treinado é uma direção de pesquisa ativa e validada clinicamente, não apenas uma escolha de engenharia de software.

### 9.3 MAX30102 e sensoriamento de baixo custo com ESP32

O sensor MAX30102 é amplamente utilizado em sistemas embarcados de monitoramento fisiológico devido à facilidade de integração com plataformas como o ESP32 e à capacidade de aquisição contínua de sinais fotopletismográficos (PPG) (9).

Estudos de validação de sensores fotopletismográficos vestíveis indicam que dispositivos de baixo custo podem atingir níveis adequados de precisão para aplicações de monitoramento contínuo, embora limitações relacionadas a movimento, posicionamento do sensor e condições ambientais devam ser consideradas (10). A estimativa de saturação periférica de oxigênio obtida por sensores PPG de baixo custo pode sofrer influência de fatores como movimento, perfusão periférica reduzida e interferência luminosa, exigindo calibração adequada e validação experimental antes da utilização em cenários clínicos.

Assim, neste trabalho, o conjunto ESP32 + MAX30102 deve ser interpretado como uma plataforma de aquisição experimental para validação arquitetural da solução proposta, e não como um dispositivo médico validado.

### 9.4 Posicionamento deste projeto frente ao estado da arte

Comparado aos frameworks acadêmicos mais sofisticados revisados acima (que envolvem bancos de grafo, camadas adicionais de "roof computing", criptografia ponta-a-ponta e modelos de deep learning), este projeto se posiciona como uma prova de conceito funcional e didática, que implementa o núcleo conceitual de uma arquitetura fog-cloud-ML para IoMT, mas conscientemente simplificada para viabilizar a montagem completa, da camada de hardware até o dashboard.

As principais diferenças em relação ao estado da arte mais avançado incluem: ausência de criptografia/autenticação na comunicação MQTT (presente em frameworks de segurança como os descritos em (5) e (6)); uso de um banco relacional simples em vez de bancos orientados a grafo otimizados para dados de série temporal de saúde (4); e treinamento do modelo de ML sobre dados sintéticos, em vez de dados clínicos reais validados externamente, como nos estudos de NEWS vs. Random Forest revisados (2, 3, 7, 8). Essas diferenças representam oportunidades claras de trabalho futuro, não falhas do protótipo atual.

---

## 10. Limitações e trabalhos futuros

- Treinar o modelo de Random Forest com dados clínicos reais ou datasets públicos validados (ex. MIMIC-III/IV), em vez de dados sintéticos.
- Incorporar histórico temporal do paciente na predição de risco (tendência de piora/melhora), em vez de avaliar apenas o estado pontual mais recente.
- Adicionar autenticação e criptografia na comunicação MQTT.
- Implementar notificação ativa para familiares e equipe médica.
- Validar formalmente a acurácia dos sensores (MAX30102 e DS18B20) contra equipamento médico de referência, seguindo metodologia de concordância (ex. análise de Bland-Altman).

---

## Referências lidas

(1) Islam, U., Alatawi, M. N., Alqazzaz, A., Alamro, S., Shah, B., & Moreira, F. (2025). A hybrid fog-edge computing architecture for real-time health monitoring in IoMT systems with optimized latency and threat resilience. Scientific Reports, 15, 25655. https://doi.org/10.1038/s41598-025-09696-3

(2) Pirneskoski, J., Tamminen, J., Kallonen, A., Nurmi, J., Kuisma, M., Olkkola, K. T., & Hoppu, S. (2020). Random forest machine learning method outperforms prehospital National Early Warning Score for predicting one-day mortality: A retrospective study. Resuscitation Plus, 4, 100046. https://doi.org/10.1016/j.resplu.2020.100046

(3) Wang, X., Li, Y., Zhang, H., et al. (2025). Machine learning to improve predictive performance of prehospital early warning scores. Scientific Reports, 15. https://www.nature.com/articles/s41598-025-08247-0

(4) Fog Computing and Graph-Based Databases for Remote Health Monitoring in IoMT Settings. (2025). IoT, 6(4), 76. https://doi.org/10.3390/iot6040076

(5) Bhattacharya, P., Mukherjee, A., Bhushan, B., Gupta, S. K., Gadekallu, T. R., & Zhu, Z. (2025). A secured remote patient monitoring framework for IoMT ecosystems. Scientific Reports, 15, 22882. https://doi.org/10.1038/s41598-025-04774-y

(6) Bhattacharya, P., Mukherjee, A., Bhushan, B., Gupta, S. K., Gadekallu, T. R., & Zhu, Z. (2025). A secured remote patient monitoring framework for IoMT ecosystems — detailed fog-node implementation and ESP32 deployment architecture. PMC. https://pmc.ncbi.nlm.nih.gov/articles/PMC12217842/

(7) Campbell, D., Dutta, S., Austin, E., et al. (2024). Performance of machine learning versus the National Early Warning Score for predicting patient deterioration risk. BMJ Health & Care Informatics, 31(1), e101088. https://pmc.ncbi.nlm.nih.gov/articles/PMC11624723/

(8) Kipnis, P., Turk, B. J., Wulf, D. A., et al. (2022). Using machine learning to improve the accuracy of patient deterioration predictions: Mayo Clinic Early Warning Score (MC-EWS). Journal of the American Medical Informatics Association. https://pmc.ncbi.nlm.nih.gov/articles/PMC8661441/

(9) Affordable Heart Health Monitoring System Using ESP32, AD8232 and MAX30102. (2026). ResearchGate. https://www.researchgate.net/publication/398266791

(10) Evaluating the Accuracy of Low-Cost Wearable Sensors for Healthcare Monitoring. (2025). Micromachines. https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12299930/

(11) Maxwell, A., Lee, J., Kumar, P., et al. (2024). Accuracy limitations and calibration challenges of MAX30102-based pulse oximetry systems under ambient light interference. Sensors, 24(11), 3551.

(12) ESP32-Powered Heart Rate and Pulse Oximetry Monitoring with MAX30102. Espressif Systems. https://www.espressif.com/en/news/ESP32_and_MAX30102
