import { formatTime } from '../../utils/formatters';

/**
 * Tooltip compartilhado pelos gráficos. `render` recebe o ponto do dado e
 * devolve o conteúdo principal.
 */
export function ChartTooltip({ active, payload, render }) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point || point.gap) return null;

  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container px-2.5 py-1.5 text-label-md text-on-surface shadow-lg shadow-black/40">
      <div className="mb-0.5 text-[10px] text-outline tabular-nums">{formatTime(point.t)}</div>
      <div className="font-semibold tabular-nums">{render(point)}</div>
    </div>
  );
}
