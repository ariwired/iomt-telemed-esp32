import { RISK_LEVELS, RISK_SOURCES, VITALS } from './vitals';

/**
 * Leitura normalizada usada por toda a interface.
 * @typedef {Object} Reading
 * @property {string} id
 * @property {number} t                     Epoch em milissegundos.
 * @property {number|null} spo2
 * @property {number|null} frequenciaCardiaca
 * @property {number|null} temperatura
 * @property {keyof RISK_LEVELS|null} riskLevel  Só presente nas leituras avaliadas.
 * @property {number|null} riskScore        Gravidade em [0, 1] (0 = baixo, 1 = crítico).
 * @property {number|null} riskConfidence   Confiança do modelo no nível previsto, em [0, 1].
 * @property {keyof RISK_SOURCES|null} riskSource  Quem avaliou: modelo ou regras locais.
 * @property {string|null} source
 */

/**
 * Dados do dashboard prontos para exibição.
 * @typedef {Object} PatientDashboard
 * @property {string} pacienteId
 * @property {string|null} nome
 * @property {Reading[]} readings           Ordem cronológica crescente, sem duplicatas.
 * @property {Reading|null} latest
 * @property {{ level: string, score: number|null, confidence: number|null, source: string|null, t: number } | null} latestRisk
 * @property {string} signature             Muda somente quando o conteúdo muda.
 */

/**
 * Converte o timestamp vindo do Jackson em epoch (ms).
 * Aceita ISO-8601, epoch em segundos (com fração) ou milissegundos, e o formato
 * em array `[ano, mês, dia, hora, min, seg, nanos]`.
 */
export function parseTimestamp(raw) {
  if (raw == null) return null;

  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return null;
    // Valores abaixo de 1e12 são segundos (1e12 ms ≈ 2001-09-09).
    return raw < 1e12 ? Math.round(raw * 1000) : raw;
  }

  if (Array.isArray(raw)) {
    const [y, mo = 1, d = 1, h = 0, mi = 0, s = 0, nanos = 0] = raw;
    const t = Date.UTC(y, mo - 1, d, h, mi, s, Math.floor(nanos / 1e6));
    return Number.isFinite(t) ? t : null;
  }

  if (typeof raw === 'string') {
    const t = Date.parse(raw);
    return Number.isFinite(t) ? t : null;
  }

  return null;
}

/** Descarta valores não numéricos ou fora da faixa plausível do sensor. */
export function sanitizeVital(value, [min, max]) {
  const n = typeof value === 'string' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  return n >= min && n <= max ? n : null;
}

function sanitizeRiskLevel(level) {
  if (typeof level !== 'string') return null;
  const key = level.trim().toUpperCase();
  return key in RISK_LEVELS ? key : null;
}

/** Proporção em [0, 1]; qualquer outra coisa vira null. */
function sanitizeFraction(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1 ? value : null;
}

function sanitizeRiskSource(source) {
  return typeof source === 'string' && source in RISK_SOURCES ? source : null;
}

function normalizeReading(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const t = parseTimestamp(raw.timestamp);
  if (t == null) return null;

  const reading = {
    id: raw.id != null ? String(raw.id) : `t${t}`,
    t,
    riskLevel: null,
    riskScore: null,
    riskConfidence: null,
    riskSource: null,
    source: raw.source ?? null,
  };

  for (const vital of VITALS) {
    reading[vital.key] = sanitizeVital(raw[vital.key], vital.validRange);
  }

  // O backend só grava risco em uma leitura por janela de análise; o nível é o
  // que marca a leitura como avaliada.
  const level = sanitizeRiskLevel(raw.riskLevel);
  if (level) {
    reading.riskLevel = level;
    reading.riskSource = sanitizeRiskSource(raw.riskSource);
    // Registros gravados antes de existir `riskSource` guardavam a confiança do
    // modelo em `riskScore`. Sem a origem não dá para saber o que o número é,
    // então ele é descartado em vez de exibido como gravidade.
    if (reading.riskSource) {
      reading.riskScore = sanitizeFraction(raw.riskScore);
      reading.riskConfidence = sanitizeFraction(raw.riskConfidence);
    }
  }

  return reading;
}

function buildSignature(readings) {
  return readings.map((r) => `${r.id}:${r.riskLevel ?? ''}`).join('|');
}

/**
 * Normaliza a resposta de `GET /api/dashboard/patient/{id}`.
 *
 * - Ordena por tempo e remove duplicatas (o mesmo id pode vir em
 *   `currentVitals` e em `historicalSeries`).
 * - Valores inválidos de sensor viram `null`, o que abre uma lacuna no gráfico em
 *   vez de desenhar uma queda falsa até zero.
 * - Não preenche risco para frente: cada leitura mostra apenas o que foi
 *   avaliado nela. O risco atual é o da avaliação mais recente.
 *
 * @returns {PatientDashboard|null}
 */
export function normalizeDashboard(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const candidates = [...(Array.isArray(raw.historicalSeries) ? raw.historicalSeries : [])];
  if (raw.currentVitals) candidates.push(raw.currentVitals);

  const byId = new Map();
  for (const item of candidates) {
    const reading = normalizeReading(item);
    if (!reading) continue;
    const previous = byId.get(reading.id);
    // Mantém a versão que tem avaliação de risco, se houver.
    if (!previous || (!previous.riskLevel && reading.riskLevel)) {
      byId.set(reading.id, reading);
    }
  }

  const readings = [...byId.values()].sort((a, b) => a.t - b.t || a.id.localeCompare(b.id));

  let latestRisk = null;
  for (let i = readings.length - 1; i >= 0; i--) {
    const r = readings[i];
    if (r.riskLevel) {
      latestRisk = {
        level: r.riskLevel,
        score: r.riskScore,
        confidence: r.riskConfidence,
        source: r.riskSource,
        t: r.t,
      };
      break;
    }
  }

  return {
    pacienteId: String(raw.pacienteId ?? ''),
    nome: raw.nome ?? null,
    readings,
    latest: readings.at(-1) ?? null,
    latestRisk,
    signature: `${raw.pacienteId}#${raw.nome}#${buildSignature(readings)}`,
  };
}
