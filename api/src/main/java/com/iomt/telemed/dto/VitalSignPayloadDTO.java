package com.iomt.telemed.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VitalSignPayloadDTO {

    @NotBlank
    @JsonProperty("paciente_id")
    private String pacienteId;

    @NotNull
    private Integer spo2;

    @NotNull
    private Integer fc;

    @NotNull
    private Double temp;
}