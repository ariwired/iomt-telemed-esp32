export function classifySpo2(value) {
  if (value === null || value === undefined) return { tone: "unknown", label: "Sem leitura" };
  if (value < 90) return { tone: "critical", label: "Crítico" };
  if (value < 95) return { tone: "warning", label: "Atenção" };
  return { tone: "normal", label: "Normal" };
}

export function classifyHeartRate(value) {
  if (value === null || value === undefined || value === 0) {
    return { tone: "unknown", label: "Sem leitura" };
  }
  if (value < 50 || value > 110) return { tone: "warning", label: "Atenção" };
  return { tone: "normal", label: "Normal" };
}

export function classifyTemperature(value) {
  if (value === null || value === undefined) return { tone: "unknown", label: "Sem leitura" };
  if (value > 38.5) return { tone: "critical", label: "Febre alta" };
  if (value > 37.5) return { tone: "warning", label: "Febre" };
  return { tone: "normal", label: "Normal" };
}

const RISK_META = {
  LOW: { label: "Baixo", tone: "low", order: 0 },
  MEDIUM: { label: "Médio", tone: "medium", order: 1 },
  HIGH: { label: "Alto", tone: "high", order: 2 },
  CRITICAL: { label: "Crítico", tone: "critical", order: 3 }
};

export function riskMeta(level) {
  return RISK_META[level] ?? { label: "Calculando Risco...", tone: "unknown", order: -1 };
}

export function formatClock(date) {
  return date.toLocaleTimeString("pt-BR", { hour12: false });
}

export function formatTimestamp(isoString) {
  if (!isoString) return "—";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("pt-BR", { hour12: false });
}

export function formatDateTime(isoString) {
  if (!isoString) return "—";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR", { hour12: false });
}

export function secondsSince(isoString) {
  if (!isoString) return Infinity;
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return Infinity;
  return (Date.now() - date.getTime()) / 1000;
}

export function formatNumber(value, digits = 0) {
  if (value === null || value === undefined) return "--";
  return value.toFixed(digits);
}
