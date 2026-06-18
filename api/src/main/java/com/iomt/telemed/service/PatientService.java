package com.iomt.telemed.service;

import com.iomt.telemed.entity.Patient;
import com.iomt.telemed.repository.PatientRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PatientService {

    private final PatientRepository patientRepository;

    public PatientService(PatientRepository patientRepository) {
        this.patientRepository = patientRepository;
    }

    @Transactional
    public void ensurePatientExists(String pacienteId) {
        if (pacienteId == null || pacienteId.isBlank()) {
            return;
        }

        if (patientRepository.existsById(pacienteId)) {
            return;
        }

        Patient novoPaciente = Patient.builder()
                .pacienteId(pacienteId)
                .nome("Paciente " + pacienteId)
                .build();

        patientRepository.save(novoPaciente);
    }
}