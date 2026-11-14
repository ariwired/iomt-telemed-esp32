package com.iomt.telemed.controller;

import com.iomt.telemed.dto.DashboardMetricsDTO;
import com.iomt.telemed.entity.Patient;
import com.iomt.telemed.entity.VitalSign;
import com.iomt.telemed.repository.PatientRepository;
import com.iomt.telemed.repository.VitalSignRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private static final int MAX_HISTORY = 500;

    private final VitalSignRepository vitalSignRepository;
    private final PatientRepository patientRepository;

    public DashboardController(VitalSignRepository vitalSignRepository, PatientRepository patientRepository) {
        this.vitalSignRepository = vitalSignRepository;
        this.patientRepository = patientRepository;
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<DashboardMetricsDTO> getMetrics(
            @PathVariable String patientId,
            @RequestParam(defaultValue = "60") int limit) {

        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Paciente não encontrado."));

        int pageSize = Math.max(1, Math.min(limit, MAX_HISTORY));
        List<VitalSign> history = vitalSignRepository.findByPacienteIdOrderByTimestampDesc(patientId, PageRequest.of(0, pageSize));
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
