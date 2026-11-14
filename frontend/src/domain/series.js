import { RISK_LEVELS } from './vitals';

/** Número de leituras exibidas em cada gráfico e usadas nas estatísticas. */
export const CHART_WINDOW = 40;

/**
 * Série de um sinal vital para o gráfico. Leituras sem valor válido entram como
 * `null` para que o gráfico mostre uma lacuna no ponto onde o sensor falhou.
 *
 * @param {import('./normalize').Reading[]} readings
 * @param {string} key
 * @param {number} [limit]
 * @returns {{ t: number, value: number|null }[]}
 */
export function buildVitalSeries(readings, key, limit = Infinity) {
  const window = Number.isFinite(limit) ? readings.slice(-limit) : readings;
  return window.map((r) => ({ t: r.t, value: r[key] ?? null }));
}

/**
 * Série do nível de risco, só com as leituras que foram avaliadas.
 * @returns {{ t: number, rank: number, level: string, score: number|null, confidence: number|null, source: string|null }[]}
 */
export function buildRiskSeries(readings, limit = Infinity) {
  const evaluated = readings.filter((r) => r.riskLevel);
  const window = Number.isFinite(limit) ? evaluated.slice(-limit) : evaluated;
  return window.map((r) => ({
    t: r.t,
    rank: RISK_LEVELS[r.riskLevel].rank,
    level: r.riskLevel,
    score: r.riskScore,
    confidence: r.riskConfidence,
    source: r.riskSource,
  }));
}

/**
 * Estatísticas calculadas sobre os mesmos pontos desenhados no gráfico,
 * para que mínimo, média e máximo batam com o que se vê.
 *
 * `delta` compara as duas últimas leituras válidas.
 */
export function computeStats(series) {
  const values = series.map((p) => p.value).filter((v) => v != null);
  if (!values.length) return { min: null, max: null, avg: null, delta: null, count: 0 };

  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
  }

  return {
    min,
    max,
    avg: sum / values.length,
    delta: values.length >= 2 ? values.at(-1) - values.at(-2) : null,
    count: values.length,
  };
}

/**
 * Domínio do eixo Y: cobre os dados e a faixa normal, com folga, sem sair da
 * faixa plausível do sensor. Arredonda para valores "redondos" para que os ticks
 * não mudem a cada atualização por causa de variações pequenas.
 */
export function computeYDomain(values, { normalRange, validRange, decimals = 0 }) {
  const finite = values.filter((v) => v != null && Number.isFinite(v));
  let lo = Math.min(...finite, ...(normalRange ?? []));
  let hi = Math.max(...finite, ...(normalRange ?? []));

  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return ['auto', 'auto'];

  const step = decimals > 0 ? 0.5 : 5;
  const pad = Math.max((hi - lo) * 0.1, step);
  lo = Math.floor((lo - pad) / step) * step;
  hi = Math.ceil((hi + pad) / step) * step;

  if (validRange) {
    lo = Math.max(lo, validRange[0]);
    hi = Math.min(hi, validRange[1]);
  }
  return [lo, hi];
}

/**
 * Domínio do eixo de tempo. Com um único ponto, abre uma janela ao redor dele
 * para o ponto não ficar colado na borda.
 */
export function computeTimeDomain(series, minSpanMs = 60_000) {
  if (!series.length) return ['auto', 'auto'];
  const first = series[0].t;
  const last = series.at(-1).t;
  if (last - first >= minSpanMs) return [first, last];
  const mid = (first + last) / 2;
  return [mid - minSpanMs / 2, mid + minSpanMs / 2];
}

/** Gap acima do qual consideramos que houve interrupção da transmissão. */
export function medianInterval(series) {
  if (series.length < 2) return null;
  const gaps = [];
  for (let i = 1; i < series.length; i++) gaps.push(series[i].t - series[i - 1].t);
  gaps.sort((a, b) => a - b);
  return gaps[Math.floor(gaps.length / 2)];
}

/**
 * Insere um ponto nulo entre leituras separadas por um intervalo muito maior
 * que o normal, para que a linha não ligue dois momentos distantes como se
 * houvesse dados contínuos entre eles.
 */
export function breakLongGaps(series, factor = 3) {
  const median = medianInterval(series);
  if (!median) return series;
  const threshold = median * factor;

  const out = [];
  let changed = false;
  for (let i = 0; i < series.length; i++) {
    if (i > 0 && series[i].t - series[i - 1].t > threshold) {
      out.push({ t: (series[i - 1].t + series[i].t) / 2, value: null, gap: true });
      changed = true;
    }
    out.push(series[i]);
  }
  return changed ? out : series;
}
