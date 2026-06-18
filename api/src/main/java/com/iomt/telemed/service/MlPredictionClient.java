package com.iomt.telemed.service;

import com.iomt.telemed.dto.MlPredictionResponseDTO;
import com.iomt.telemed.entity.VitalSign;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Map;
import java.util.Optional;

@Service
public class MlPredictionClient {

    private static final Logger logger = LoggerFactory.getLogger(MlPredictionClient.class);
    private final RestClient mlApiRestClient;

    public MlPredictionClient(RestClient mlApiRestClient) {
        this.mlApiRestClient = mlApiRestClient;
    }

    public Optional<MlPredictionResponseDTO> predict(VitalSign vitals) {
        try {
            Map<String, Object> body = Map.of(
                    "spo2", vitals.getSpo2(),
                    "fc", vitals.getFrequenciaCardiaca(),
                    "temp", vitals.getTemperatura()
            );

            MlPredictionResponseDTO response = mlApiRestClient.post()
                    .uri("/predict")
                    .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(MlPredictionResponseDTO.class);

            return Optional.ofNullable(response);
        } catch (Exception e) {
            logger.warn("ml-api indisponível ou retornou erro, usando fallback local. Causa: {}", e.getMessage());
            return Optional.empty();
        }
    }
}