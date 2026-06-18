package com.iomt.telemed.dto;

import com.iomt.telemed.entity.VitalSign;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardMetricsDTO {

    private String pacienteId;

    private String nome;

    private VitalSign currentVitals;

    private List<VitalSign> historicalSeries;
}