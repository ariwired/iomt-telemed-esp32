import { describe, expect, it } from 'vitest';
import { normalizeDashboard, parseTimestamp, sanitizeVital } from './normalize';

const reading = (id, iso, extra = {}) => ({
  id,
  pacienteId: '1234',
  spo2: 97,
  frequenciaCardiaca: 75,
  temperatura: 36.6,
  riskScore: null,
  riskLevel: null,
  source: 'MQTT_FOG',
  timestamp: iso,
  ...extra,
});

describe('parseTimestamp', () => {
  it('aceita ISO com microssegundos', () => {
    expect(parseTimestamp('2026-11-14T12:00:00.123456Z')).toBe(Date.UTC(2026, 10, 14, 12, 0, 0, 123));
  });

  it('aceita epoch em segundos com fração (Jackson WRITE_DATES_AS_TIMESTAMPS)', () => {
    expect(parseTimestamp(1_700_000_000.5)).toBe(1_700_000_000_500);
  });

  it('aceita epoch em milissegundos', () => {
    expect(parseTimestamp(1_700_000_000_500)).toBe(1_700_000_000_500);
  });

  it('aceita o formato em array do Jackson', () => {
    expect(parseTimestamp([2026, 11, 14, 12, 0, 1, 500_000_000])).toBe(Date.UTC(2026, 10, 14, 12, 0, 1, 500));
  });

  it('rejeita lixo', () => {
    expect(parseTimestamp('ontem')).toBeNull();
    expect(parseTimestamp(undefined)).toBeNull();
  });
});

describe('sanitizeVital', () => {
  it('descarta o 0 que o firmware envia sem dedo no sensor', () => {
    expect(sanitizeVital(0, [50, 100])).toBeNull();
  });

  it('descarta -127 do DS18B20 desconectado', () => {
    expect(sanitizeVital(-127, [25, 45])).toBeNull();
  });

  it('mantém valores plausíveis', () => {
    expect(sanitizeVital(36.6, [25, 45])).toBe(36.6);
  });
});

describe('normalizeDashboard', () => {
  it('ordena em ordem crescente e remove duplicata de currentVitals', () => {
    const latest = reading(3, '2026-11-14T12:00:10Z');
    const result = normalizeDashboard({
      pacienteId: '1234',
      nome: 'Paciente 1234',
      currentVitals: latest,
      historicalSeries: [latest, reading(2, '2026-11-14T12:00:05Z'), reading(1, '2026-11-14T12:00:00Z')],
    });

    expect(result.readings.map((r) => r.id)).toEqual(['1', '2', '3']);
    expect(result.latest.id).toBe('3');
  });

  it('não propaga risco para leituras não avaliadas', () => {
    const result = normalizeDashboard({
      pacienteId: '1234',
      historicalSeries: [
        reading(1, '2026-11-14T12:00:00Z', {
          riskScore: 0.1,
          riskConfidence: 0.9,
          riskLevel: 'LOW',
          riskSource: 'ML_MODEL',
        }),
        reading(2, '2026-11-14T12:00:05Z'),
      ],
    });

    expect(result.readings[1].riskLevel).toBeNull();
    expect(result.latestRisk).toEqual({
      level: 'LOW',
      score: 0.1,
      confidence: 0.9,
      source: 'ML_MODEL',
      t: Date.parse('2026-11-14T12:00:00Z'),
    });
  });

  it('separa gravidade e confiança; regras locais não têm confiança', () => {
    const result = normalizeDashboard({
      pacienteId: '1',
      historicalSeries: [
        reading(1, '2026-11-14T12:00:00Z', { riskScore: 0.6, riskLevel: 'HIGH', riskSource: 'LOCAL_RULES' }),
      ],
    });
    expect(result.latest).toMatchObject({ riskScore: 0.6, riskConfidence: null, riskSource: 'LOCAL_RULES' });
  });

  it('descarta score de registro legado sem origem (era confiança, não gravidade)', () => {
    const result = normalizeDashboard({
      pacienteId: '1',
      historicalSeries: [reading(1, '2026-11-14T12:00:00Z', { riskScore: 0.95, riskLevel: 'LOW' })],
    });
    expect(result.latest).toMatchObject({ riskLevel: 'LOW', riskScore: null, riskConfidence: null });
  });

  it('transforma leitura sem dedo em lacuna, não em zero', () => {
    const result = normalizeDashboard({
      pacienteId: '1234',
      historicalSeries: [reading(1, '2026-11-14T12:00:00Z', { spo2: 0, frequenciaCardiaca: 0 })],
    });
    expect(result.latest.spo2).toBeNull();
    expect(result.latest.frequenciaCardiaca).toBeNull();
    expect(result.latest.temperatura).toBe(36.6);
  });

  it('assinatura estável para o mesmo conteúdo e diferente quando o risco chega', () => {
    const base = { pacienteId: '1', historicalSeries: [reading(1, '2026-11-14T12:00:00Z')] };
    const evaluated = {
      pacienteId: '1',
      historicalSeries: [reading(1, '2026-11-14T12:00:00Z', { riskLevel: 'HIGH', riskScore: 0.7 })],
    };
    expect(normalizeDashboard(base).signature).toBe(normalizeDashboard(base).signature);
    expect(normalizeDashboard(base).signature).not.toBe(normalizeDashboard(evaluated).signature);
  });

  it('lida com resposta vazia', () => {
    const result = normalizeDashboard({ pacienteId: '1', nome: 'X', currentVitals: null, historicalSeries: [] });
    expect(result.readings).toEqual([]);
    expect(result.latest).toBeNull();
    expect(result.latestRisk).toBeNull();
  });
});
