export function formatTimestamp(timestamp) {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatDateTime(timestamp) {
  if (!timestamp) return '—';
  return new Date(timestamp)
    .toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    .replace(',', ' ·');
}

export function formatRelativeTime(date) {
  if (!date) return '—';
  const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSeconds < 5)    return 'agora mesmo';
  if (diffSeconds < 60)   return `há ${diffSeconds}s`;
  if (diffSeconds < 3600) return `há ${Math.floor(diffSeconds / 60)}min`;
  return `há ${Math.floor(diffSeconds / 3600)}h`;
}

export function prepareChartData(series, dataKey, limit = 30, { skipFilled = false } = {}) {
  if (!series?.length) return [];
  return [...series]
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    .slice(-limit)
    .map((point, index) => ({
      index,
      value:   point[dataKey] ?? null,
      ts:      point.timestamp,
      _filled: dataKey === 'riskScore' && !!point._riskScoreFilled,
    }))
    .filter((p) => p.value != null)
    .filter((p) => !(skipFilled && p._filled));
}

export function computeStats(series, dataKey) {
  const sorted = [...series]
    .filter((p) => p[dataKey] != null)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  if (!sorted.length) return { min: null, max: null, avg: null, delta: null };
  const values = sorted.map((p) => p[dataKey]);
  const min    = Math.min(...values);
  const max    = Math.max(...values);
  const avg    = values.reduce((s, v) => s + v, 0) / values.length;
  const delta  = values.length >= 2
    ? values[values.length - 1] - values[values.length - 2]
    : null;
  return { min, max, avg, delta };
}