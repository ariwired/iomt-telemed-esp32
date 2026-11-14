package com.iomt.telemed.service;

import com.iomt.telemed.dto.MlPredictionResponseDTO;
import com.iomt.telemed.dto.VitalSignPayloadDTO;
import com.iomt.telemed.entity.VitalSign;
import com.iomt.telemed.repository.VitalSignRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.OptionalDouble;
import java.util.stream.Collectors;

@Service
public class VitalSignService {

    private static final Logger logger = LoggerFactory.getLogger(VitalSignService.class);
    private final VitalSignRepository vitalSignRepository;
    private final PredictiveRiskService predictiveRiskService;
    private final MlPredictionClient mlPredictionClient;
    private final PatientService patientService;

    public VitalSignService(VitalSignRepository vitalSignRepository,
                            PredictiveRiskService predictiveRiskService,
                            MlPredictionClient mlPredictionClient,
                            PatientService patientService) {
        this.vitalSignRepository = vitalSignRepository;
        this.predictiveRiskService = predictiveRiskService;
        this.mlPredictionClient = mlPredictionClient;
        this.patientService = patientService;
    }

    @Transactional
    public VitalSign processAndSaveTelemetry(VitalSignPayloadDTO dto) {
        patientService.ensurePatientExists(dto.getPacienteId());

        // O firmware envia 0 para SpO2/FC quando não há dedo no sensor, e o DS18B20
        // devolve -127 quando desconectado. Esses valores não são medições: gravamos
        // null para não distorcer gráficos, médias e a análise de risco.
        VitalSign entity = VitalSign.builder()
                .pacienteId(dto.getPacienteId())
                .spo2(withinRange(dto.getSpo2(), SPO2_MIN, SPO2_MAX))
                .frequenciaCardiaca(withinRange(dto.getFc(), FC_MIN, FC_MAX))
                .temperatura(withinRange(dto.getTemp(), TEMP_MIN, TEMP_MAX))
                .source("MQTT_FOG")
                .build();

        return vitalSignRepository.save(entity);
    }

    // Faixas fisiologicamente plausíveis (as mesmas aceitas pelo ml-api).
    private static final int SPO2_MIN = 50, SPO2_MAX = 100;
    private static final int FC_MIN = 20, FC_MAX = 250;
    private static final double TEMP_MIN = 25.0, TEMP_MAX = 45.0;

    private static Integer withinRange(Integer value, int min, int max) {
        return value != null && value >= min && value <= max ? value : null;
    }

    private static Double withinRange(Double value, double min, double max) {
        return value != null && value >= min && value <= max ? value : null;
    }

    @Scheduled(fixedRate = 30000) // 30s definido para a apresentação do projeto, idealmente era 15 min
    @Transactional
    public void runMachineLearningBatchAnalysis() {
        logger.info("Iniciando varredura...");

        Instant janela = Instant.now().minus(30, ChronoUnit.SECONDS);
        List<VitalSign> leituras = vitalSignRepository.findByTimestampAfterOrderByTimestampAsc(janela);

        if (leituras.isEmpty()) {
            return;
        }

        Map<String, List<VitalSign>> dadosPorPaciente = leituras.stream()
                .collect(Collectors.groupingBy(VitalSign::getPacienteId));

        for (Map.Entry<String, List<VitalSign>> entry : dadosPorPaciente.entrySet()) {
            String pacienteId = entry.getKey();
            List<VitalSign> leiturasDoPaciente = entry.getValue();

            // Médias só com leituras válidas (null = sensor sem medição). Antes, os
            // zeros de "sem dedo" entravam na média e derrubavam SpO2/FC, gerando
            // risco falso; e um null causaria NullPointerException no unboxing.
            OptionalDouble spo2 = leiturasDoPaciente.stream().map(VitalSign::getSpo2)
                    .filter(Objects::nonNull).mapToInt(Integer::intValue).average();
            OptionalDouble fc = leiturasDoPaciente.stream().map(VitalSign::getFrequenciaCardiaca)
                    .filter(Objects::nonNull).mapToInt(Integer::intValue).average();
            OptionalDouble temp = leiturasDoPaciente.stream().map(VitalSign::getTemperatura)
                    .filter(Objects::nonNull).mapToDouble(Double::doubleValue).average();

            if (spo2.isEmpty() || fc.isEmpty() || temp.isEmpty()) {
                logger.info("   -> Paciente [{}] sem leituras válidas suficientes na janela; análise ignorada.", pacienteId);
                continue;
            }

            int mediaSpo2 = (int) Math.round(spo2.getAsDouble());
            int mediaFc = (int) Math.round(fc.getAsDouble());
            double mediaTemp = temp.getAsDouble();

            logger.info("   -> Paciente [{}] -> Média SpO2: {}% | FC: {} | Temp: {}C", pacienteId, mediaSpo2, mediaFc, String.format("%.1f", mediaTemp));

            VitalSign tendencia = VitalSign.builder()
                    .spo2(mediaSpo2)
                    .frequenciaCardiaca(mediaFc)
                    .temperatura(mediaTemp)
                    .build();

            PredictiveRiskService.RiskAnalysis analise = resolveRiskAnalysis(tendencia);

            VitalSign ultimaLeituraReal = leiturasDoPaciente.get(leiturasDoPaciente.size() - 1);
            ultimaLeituraReal.setRiskScore(analise.score());
            ultimaLeituraReal.setRiskConfidence(analise.confidence());
            ultimaLeituraReal.setRiskLevel(analise.level());
            ultimaLeituraReal.setRiskSource(analise.source());

            vitalSignRepository.save(ultimaLeituraReal);

            logger.info("Veredito salvo para Paciente [{}]: Risco {}", pacienteId, analise.level());
        }
        logger.info("---------------------------------------------------");
    }

    /**
     * Tenta obter o veredito do ml-api (Random Forest treinado em Python).
     * Se a chamada falhar (timeout, ml-api fora do ar, resposta inválida),
     * cai no PredictiveRiskService local como fallback, para o pipeline
     * de telemetria nunca travar por causa de uma dependência externa.
     */
    private PredictiveRiskService.RiskAnalysis resolveRiskAnalysis(VitalSign tendencia) {
        Optional<MlPredictionResponseDTO> mlResponse = mlPredictionClient.predict(tendencia);

        if (mlResponse.isPresent()) {
            try {
                MlPredictionResponseDTO prediction = mlResponse.get();
                VitalSign.RiskLevel level = PredictiveRiskService.parseLevel(prediction.getLevel());
                Double score = prediction.getRiskScore();
                if (score == null || score < 0 || score > 1) {
                    throw new IllegalArgumentException("risk_score ausente ou fora de [0, 1]: " + score);
                }
                return new PredictiveRiskService.RiskAnalysis(
                        score, prediction.getConfidence(), level, VitalSign.RiskSource.ML_MODEL);
            } catch (Exception e) {
                logger.warn("Resposta do ml-api em formato inesperado, usando fallback local. Causa: {}", e.getMessage());
            }
        }

        return predictiveRiskService.evaluateRisk(tendencia);
    }
}