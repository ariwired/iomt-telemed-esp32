// Configuração lida das variáveis de ambiente do Vite (prefixo VITE_).

function positiveNumber(raw, fallback) {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

/** Intervalo entre consultas à API (ms). */
export const POLL_INTERVAL_MS = positiveNumber(import.meta.env.VITE_POLL_INTERVAL_MS, 4000);

/** Quantidade de leituras históricas pedidas à API. */
export const HISTORY_LIMIT = positiveNumber(import.meta.env.VITE_HISTORY_LIMIT, 60);
