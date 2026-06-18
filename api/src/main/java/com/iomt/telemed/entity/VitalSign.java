package com.iomt.telemed.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "vital_signs", indexes = {
        @Index(name = "idx_vital_patient_ts", columnList = "paciente_id, timestamp DESC"),
        @Index(name = "idx_vital_timestamp", columnList = "timestamp DESC")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VitalSign {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "paciente_id", nullable = false, length = 64)
    private String pacienteId;

    @Column(name = "spo2")
    private Integer spo2;

    @Column(name = "frequencia_cardiaca")
    private Integer frequenciaCardiaca;

    @Column(name = "temperatura")
    private Double temperatura;

    @Column(name = "risk_score")
    private Double riskScore;

    @Column(name = "risk_level", length = 16)
    @Enumerated(EnumType.STRING)
    private RiskLevel riskLevel;

    @Column(name = "source", length = 32)
    @Builder.Default
    private String source = "MQTT_FOG";

    @CreationTimestamp
    @Column(name = "timestamp", nullable = false, updatable = false)
    private Instant timestamp;

    public enum RiskLevel {
        LOW, MEDIUM, HIGH, CRITICAL
    }
}