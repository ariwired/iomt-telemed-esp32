package com.iomt.telemed.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Resposta do ml-api (POST /predict).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class MlPredictionResponseDTO {

    /** Gravidade esperada em [0, 1], ponderada pelas probabilidades de cada nível. */
    @JsonProperty("risk_score")
    private Double riskScore;

    /** Probabilidade da classe prevista, em [0, 1]. */
    private Double confidence;

    private String level;
}
