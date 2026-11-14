const LOCALE = 'pt-BR';

const timeFormat = new Intl.DateTimeFormat(LOCALE, {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

const shortTimeFormat = new Intl.DateTimeFormat(LOCALE, {
  hour: '2-digit',
  minute: '2-digit',
});

const dateTimeFormat = new Intl.DateTimeFormat(LOCALE, {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

function toDate(value) {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 14:03:27 */
export function formatTime(value) {
  const d = toDate(value);
  return d ? timeFormat.format(d) : '—';
}

/** 14:03 */
export function formatShortTime(value) {
  const d = toDate(value);
  return d ? shortTimeFormat.format(d) : '';
}

/** 14/11/2026 · 14:03:27 */
export function formatDateTime(value) {
  const d = toDate(value);
  return d ? dateTimeFormat.format(d).replace(',', ' ·') : '—';
}

/** "agora mesmo", "há 12s", "há 3min", "há 2h" */
export function formatRelativeTime(value, now = Date.now()) {
  const d = toDate(value);
  if (!d) return '—';
  const diffSeconds = Math.max(0, Math.floor((now - d.getTime()) / 1000));
  if (diffSeconds < 5) return 'agora mesmo';
  if (diffSeconds < 60) return `há ${diffSeconds}s`;
  if (diffSeconds < 3600) return `há ${Math.floor(diffSeconds / 60)}min`;
  return `há ${Math.floor(diffSeconds / 3600)}h`;
}

export function formatPercent(value) {
  return value == null || !Number.isFinite(value) ? '—' : `${Math.round(value * 100)}%`;
}

export function formatSeconds(ms) {
  const s = Math.round(ms / 1000);
  return `${s} segundo${s === 1 ? '' : 's'}`;
}
