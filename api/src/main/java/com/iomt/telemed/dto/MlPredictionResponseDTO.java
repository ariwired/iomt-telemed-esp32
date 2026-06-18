package com.iomt.telemed.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MlPredictionResponseDTO {

    private Double score;

    private String level;
}