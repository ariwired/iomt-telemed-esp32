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
import java.util.Optional;
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

        VitalSign entity = VitalSign.builder()
                .pacienteId(dto.getPacienteId())
                .spo2(dto.getSpo2())
                .frequenciaCardiaca(dto.getFc())
                .temperatura(dto.getTemp())
                .source("MQTT_FOG")
                .build();

        return vitalSignRepository.save(entity);
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

            int mediaSpo2 = (int) leiturasDoPaciente.stream().mapToInt(VitalSign::getSpo2).average().orElse(0);
            int mediaFc = (int) leiturasDoPaciente.stream().mapToInt(VitalSign::getFrequenciaCardiaca).average().orElse(0);
            double mediaTemp = leiturasDoPaciente.stream().mapToDouble(VitalSign::getTemperatura).average().orElse(0.0);

            logger.info("   -> Paciente [{}] -> Média SpO2: {}% | FC: {} | Temp: {}C", pacienteId, mediaSpo2, mediaFc, String.format("%.1f", mediaTemp));

            VitalSign tendencia = VitalSign.builder()
                    .spo2(mediaSpo2)
                    .frequenciaCardiaca(mediaFc)
                    .temperatura(mediaTemp)
                    .build();

            PredictiveRiskService.RiskAnalysis analise = resolveRiskAnalysis(tendencia);

            VitalSign ultimaLeituraReal = leiturasDoPaciente.get(leiturasDoPaciente.size() - 1);
            ultimaLeituraReal.setRiskScore(analise.score());
            ultimaLeituraReal.setRiskLevel(analise.level());

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
                return new PredictiveRiskService.RiskAnalysis(prediction.getScore(), level);
            } catch (Exception e) {
                logger.warn("Resposta do ml-api em formato inesperado, usando fallback local. Causa: {}", e.getMessage());
            }
        }

        return predictiveRiskService.evaluateRisk(tendencia);
    }
}