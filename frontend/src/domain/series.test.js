import { describe, expect, it } from 'vitest';
import {
  breakLongGaps,
  buildRiskSeries,
  buildVitalSeries,
  computeStats,
  computeTimeDomain,
  computeYDomain,
} from './series';
import { VITALS } from './vitals';

const spo2 = VITALS.find((v) => v.key === 'spo2');
const temp = VITALS.find((v) => v.key === 'temperatura');

describe('computeStats', () => {
  it('ignora lacunas e usa as duas últimas leituras válidas para o delta', () => {
    const stats = computeStats([
      { t: 1, value: 96 },
      { t: 2, value: null },
      { t: 3, value: 98 },
      { t: 4, value: null },
    ]);
    expect(stats).toEqual({ min: 96, max: 98, avg: 97, delta: 2, count: 2 });
  });

  it('devolve nulos sem dados', () => {
    expect(computeStats([{ t: 1, value: null }]).avg).toBeNull();
  });
});

describe('computeYDomain', () => {
  it('não estende o eixo do SpO₂ acima de 100%', () => {
    const [lo, hi] = computeYDomain([97, 98, 99], spo2);
    expect(hi).toBe(100);
    expect(lo).toBeLessThanOrEqual(95);
  });

  it('inclui a faixa normal e uma folga em passos redondos', () => {
    expect(computeYDomain([36.8], temp)).toEqual([35.5, 38]);
  });

  it('não desaba para zero com valores nulos', () => {
    const [lo] = computeYDomain([null, 97, null], spo2);
    expect(lo).toBeGreaterThanOrEqual(50);
  });
});

describe('buildVitalSeries / buildRiskSeries', () => {
  const readings = [
    { t: 1, spo2: 97, riskLevel: null, riskScore: null },
    { t: 2, spo2: null, riskLevel: 'MEDIUM', riskScore: 0.8 },
    { t: 3, spo2: 95, riskLevel: null, riskScore: null },
  ];

  it('mantém lacunas na série do sinal vital', () => {
    expect(buildVitalSeries(readings, 'spo2')).toEqual([
      { t: 1, value: 97 },
      { t: 2, value: null },
      { t: 3, value: 95 },
    ]);
  });

  it('respeita o limite da janela', () => {
    expect(buildVitalSeries(readings, 'spo2', 2).map((p) => p.t)).toEqual([2, 3]);
  });

  it('série de risco só contém leituras avaliadas', () => {
    expect(buildRiskSeries(readings)).toEqual([{ t: 2, rank: 1, level: 'MEDIUM', score: 0.8 }]);
  });
});

describe('breakLongGaps', () => {
  it('insere uma quebra quando a transmissão para', () => {
    const series = [0, 5, 10, 15, 100].map((s) => ({ t: s * 1000, value: 1 }));
    const out = breakLongGaps(series);
    expect(out).toHaveLength(6);
    expect(out[4]).toMatchObject({ value: null, gap: true });
  });

  it('não altera séries regulares', () => {
    const series = [0, 5, 10].map((s) => ({ t: s * 1000, value: 1 }));
    expect(breakLongGaps(series)).toBe(series);
  });
});

describe('computeTimeDomain', () => {
  it('abre uma janela ao redor de um ponto único', () => {
    expect(computeTimeDomain([{ t: 100_000 }])).toEqual([70_000, 130_000]);
  });
});
