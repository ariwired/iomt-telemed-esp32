package com.iomt.telemed.controller;

import com.iomt.telemed.dto.DashboardMetricsDTO;
import com.iomt.telemed.entity.Patient;
import com.iomt.telemed.entity.VitalSign;
import com.iomt.telemed.repository.PatientRepository;
import com.iomt.telemed.repository.VitalSignRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final VitalSignRepository vitalSignRepository;
    private final PatientRepository patientRepository;

    public DashboardController(VitalSignRepository vitalSignRepository, PatientRepository patientRepository) {
        this.vitalSignRepository = vitalSignRepository;
        this.patientRepository = patientRepository;
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<DashboardMetricsDTO> getMetrics(@PathVariable String patientId) {

        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new IllegalArgumentException("Paciente não encontrado."));

        List<VitalSign> history = vitalSignRepository.findByPacienteIdOrderByTimestampDesc(patientId, PageRequest.of(0, 20));
        VitalSign latest = history.isEmpty() ? null : history.get(0);

        DashboardMetricsDTO metrics = DashboardMetricsDTO.builder()
                .pacienteId(patient.getPacienteId())
                .nome(patient.getNome())
                .currentVitals(latest)
                .historicalSeries(history)
                .build();

        return ResponseEntity.ok(metrics);
    }
}