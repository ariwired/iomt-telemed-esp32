package com.iomt.telemed.service;

import com.iomt.telemed.entity.VitalSign;
import org.springframework.stereotype.Service;

@Service
public class PredictiveRiskService {

    public RiskAnalysis evaluateRisk(VitalSign vitals) {
        double score = 0.1;

        if (vitals.getSpo2() != null && vitals.getSpo2() < 90) {
            score += 0.5;
        } else if (vitals.getSpo2() != null && vitals.getSpo2() < 94) {
            score += 0.25;
        }

        if (vitals.getTemperatura() != null && vitals.getTemperatura() > 38.5) {
            score += 0.3;
        }

        if (vitals.getFrequenciaCardiaca() != null &&
                (vitals.getFrequenciaCardiaca() > 110 || vitals.getFrequenciaCardiaca() < 50)) {
            score += 0.15;
        }

        score = Math.min(1.0, score);

        VitalSign.RiskLevel level;
        if (score >= 0.75) {
            level = VitalSign.RiskLevel.CRITICAL;
        } else if (score >= 0.5) {
            level = VitalSign.RiskLevel.HIGH;
        } else if (score >= 0.25) {
            level = VitalSign.RiskLevel.MEDIUM;
        } else {
            level = VitalSign.RiskLevel.LOW;
        }

        return new RiskAnalysis(score, level);
    }

    public record RiskAnalysis(Double score, VitalSign.RiskLevel level) {}
}