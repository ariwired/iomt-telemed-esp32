import { COLORS } from '../theme';

/**
 * Status clínico de uma leitura isolada.
 * @typedef {'normal' | 'warning' | 'critical' | 'unknown'} VitalStatus
 */

/**
 * Definição de cada sinal vital exibido.
 *
 * - `validRange`: faixa fisiologicamente plausível. Fora dela a leitura é tratada
 *   como ausente. O firmware envia 0 quando o dedo não está no sensor e o DS18B20
 *   retorna -127 quando desconectado; esses valores não podem virar pontos no gráfico.
 * - `normalRange`: faixa de referência destacada no gráfico.
 * - `decimals`: casas decimais usadas na exibição.
 */
export const VITALS = [
  {
    key: 'spo2',
    label: 'SpO₂',
    unit: '%',
    icon: 'respiratory_rate',
    color: COLORS.spo2,
    validRange: [50, 100],
    normalRange: [95, 100],
    decimals: 0,
    // Subida de SpO₂ é boa; queda é ruim.
    trendPolarity: 1,
    getStatus(v) {
      if (v == null) return 'unknown';
      if (v >= 95) return 'normal';
      if (v >= 90) return 'warning';
      return 'critical';
    },
  },
  {
    key: 'frequenciaCardiaca',
    label: 'Freq. Cardíaca',
    unit: 'bpm',
    icon: 'favorite',
    color: COLORS.heartRate,
    validRange: [20, 250],
    normalRange: [60, 100],
    decimals: 0,
    trendPolarity: 0,
    getStatus(v) {
      if (v == null) return 'unknown';
      if (v >= 60 && v <= 100) return 'normal';
      if (v >= 40 && v <= 130) return 'warning';
      return 'critical';
    },
  },
  {
    key: 'temperatura',
    label: 'Temperatura',
    unit: '°C',
    icon: 'device_thermostat',
    color: COLORS.temperature,
    validRange: [25, 45],
    normalRange: [36.0, 37.5],
    decimals: 1,
    trendPolarity: 0,
    getStatus(v) {
      if (v == null) return 'unknown';
      if (v >= 36.0 && v <= 37.5) return 'normal';
      if (v >= 35.0 && v <= 38.5) return 'warning';
      return 'critical';
    },
  },
];

export function formatVital(vital, value) {
  if (value == null || !Number.isFinite(value)) return '—';
  return value.toFixed(vital.decimals);
}

export const STATUS_META = {
  normal:   { label: 'Normal',  color: COLORS.normal,   textClass: 'text-primary' },
  warning:  { label: 'Atenção', color: COLORS.warning,  textClass: 'text-warning' },
  critical: { label: 'Crítico', color: COLORS.critical, textClass: 'text-error' },
  unknown:  { label: 'Sem leitura', color: COLORS.neutral, textClass: 'text-on-surface-variant' },
};

/**
 * Níveis de risco devolvidos pelo backend, em ordem crescente de gravidade.
 * `rank` é usado como eixo Y do gráfico de risco.
 */
export const RISK_LEVELS = {
  LOW:      { rank: 0, label: 'Baixo',   status: 'normal',   color: COLORS.normal,   bgClass: 'bg-risk-low-container',    textClass: 'text-primary' },
  MEDIUM:   { rank: 1, label: 'Médio',   status: 'warning',  color: COLORS.warning,  bgClass: 'bg-risk-medium-container', textClass: 'text-warning' },
  HIGH:     { rank: 2, label: 'Alto',    status: 'critical', color: COLORS.high,     bgClass: 'bg-risk-high-container',   textClass: 'text-risk-high' },
  CRITICAL: { rank: 3, label: 'Crítico', status: 'critical', color: COLORS.critical, bgClass: 'bg-error-container', textClass: 'text-on-error-container' },
};

export const RISK_LEVEL_ORDER = Object.keys(RISK_LEVELS);

/** Origem da avaliação de risco (`riskSource` no backend). */
export const RISK_SOURCES = {
  ML_MODEL: { label: 'Modelo de IA', short: 'IA' },
  LOCAL_RULES: { label: 'Regras locais (fallback)', short: 'Regras' },
};

export function riskLevelFromRank(rank) {
  return RISK_LEVEL_ORDER.find((k) => RISK_LEVELS[k].rank === rank) ?? null;
}
