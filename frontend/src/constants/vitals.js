export const VITALS_CONFIG = [
  {
    key: 'spo2',
    label: 'SpO₂',
    unit: '%',
    icon: 'respiratory_rate',
    color: '#98ffb8',
    normalRange: [95, 100],
    isInteger: true,
    positiveIsBetter: true,
    skipFilledPoints: false,
    format: (v) => (v != null ? String(v) : '—'),
    getStatus: (v) => {
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
    color: '#74db97',
    normalRange: [60, 100],
    isInteger: true,
    positiveIsBetter: null,
    skipFilledPoints: false,
    format: (v) => (v != null ? String(v) : '—'),
    getStatus: (v) => {
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
    color: '#ffd080',
    normalRange: [36.0, 37.5],
    isInteger: false,
    positiveIsBetter: null,
    skipFilledPoints: false,
    format: (v) => (v != null ? v.toFixed(1) : '—'),
    getStatus: (v) => {
      if (v == null) return 'unknown';
      if (v >= 36.0 && v <= 37.5) return 'normal';
      if (v >= 35.0 && v <= 38.5) return 'warning';
      return 'critical';
    },
  },
  {
    key: 'riskScore',
    label: 'Escore Clínico Padronizado',
    unit: '',
    icon: 'crisis_alert',
    color: '#ffb4ab',
    normalRange: [0, 0.35],
    isInteger: false,
    positiveIsBetter: false,
    // Gráfico mostra apenas os pontos onde o score foi realmente calculado
    skipFilledPoints: true,
    format: (v) => (v != null ? `${(v * 100).toFixed(0)}%` : '—'),
    getStatus: (v) => {
      if (v == null) return 'unknown';
      if (v < 0.35) return 'normal';
      if (v < 0.7)  return 'warning';
      return 'critical';
    },
  },
];

export const STATUS_META = {
  normal:   { label: 'Normal',  color: '#98ffb8', textClass: 'text-primary' },
  warning:  { label: 'Atenção', color: '#ffd080', textClass: 'text-[#ffd080]' },
  critical: { label: 'Crítico', color: '#ffb4ab', textClass: 'text-error' },
  unknown:  { label: '—',       color: '#889488', textClass: 'text-on-surface-variant' },
};

export const RISK_LEVEL_META = {
  LOW:      { label: 'BAIXO',   bgClass: 'bg-[#003823]',       textClass: 'text-primary',            dot: '#98ffb8' },
  MEDIUM:   { label: 'MÉDIO',   bgClass: 'bg-[#3d3200]',       textClass: 'text-[#ffd080]',          dot: '#ffd080' },
  HIGH:     { label: 'ALTO',    bgClass: 'bg-[#3d1a00]',       textClass: 'text-[#ffb347]',          dot: '#ffb347' },
  CRITICAL: { label: 'CRÍTICO', bgClass: 'bg-error-container', textClass: 'text-on-error-container', dot: '#ffb4ab' },
};