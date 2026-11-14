import { memo, useMemo } from 'react';
import { COLORS } from '../../theme';
import { STATUS_META, formatVital } from '../../domain/vitals';
import { CHART_WINDOW, buildVitalSeries, computeStats } from '../../domain/series';
import { VitalChart } from '../charts/VitalChart';
import { Dot } from '../ui/Dot';
import { Icon } from '../ui/Icon';
import { StatCell, StatRow } from './StatRow';

function trendColor(delta, polarity) {
  if (!polarity) return COLORS.onSurfaceVariant;
  return delta * polarity > 0 ? COLORS.normal : COLORS.critical;
}

function TrendIndicator({ delta, vital }) {
  if (delta == null) return null;

  // Variação menor que a menor unidade exibida conta como estável.
  const threshold = 0.5 * 10 ** -vital.decimals;
  if (Math.abs(delta) < threshold) {
    return (
      <div className="flex items-center gap-1 text-on-surface-variant">
        <Icon name="trending_flat" size={16} />
        <span className="text-label-md">estável</span>
      </div>
    );
  }

  const isUp = delta > 0;
  return (
    <div
      className="flex items-center gap-1"
      style={{ color: trendColor(delta, vital.trendPolarity) }}
      title="Variação em relação à leitura anterior"
    >
      <Icon name={isUp ? 'trending_up' : 'trending_down'} size={16} />
      <span className="text-label-md font-medium tabular-nums">
        {isUp ? '+' : '−'}
        {formatVital(vital, Math.abs(delta))}
      </span>
    </div>
  );
}

function VitalCardComponent({ vital, readings, currentValue }) {
  const series = useMemo(() => buildVitalSeries(readings, vital.key, CHART_WINDOW), [readings, vital.key]);
  const stats = useMemo(() => computeStats(series), [series]);
  const meta = STATUS_META[vital.getStatus(currentValue)];

  return (
    <article className="group flex flex-col gap-5 rounded-xl border border-transparent bg-surface-container p-6 transition-colors duration-200 hover:border-surface-variant">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="shrink-0 rounded-lg bg-surface-container-high p-2.5" style={{ color: vital.color }}>
            <Icon name={vital.icon} />
          </div>
          <div>
            <h3 className="text-label-md uppercase tracking-widest text-on-surface-variant">{vital.label}</h3>
            <p className="mt-1 flex items-end gap-1.5 leading-none">
              <span className="text-[28px] font-bold leading-none tabular-nums" style={{ color: vital.color }}>
                {formatVital(vital, currentValue)}
              </span>
              {currentValue != null && <span className="mb-0.5 text-body-md text-on-surface-variant">{vital.unit}</span>}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex items-center gap-1.5">
            <span className={`text-label-md uppercase tracking-widest ${meta.textClass}`}>{meta.label}</span>
            <Dot color={meta.color} size={7} glow />
          </div>
          <TrendIndicator delta={stats.delta} vital={vital} />
        </div>
      </header>

      <VitalChart vital={vital} series={series} />

      <StatRow>
        <StatCell label="Mín" value={formatVital(vital, stats.min)} unit={stats.min != null ? vital.unit : ''} />
        <StatCell label="Média" value={formatVital(vital, stats.avg)} unit={stats.avg != null ? vital.unit : ''} />
        <StatCell label="Máx" value={formatVital(vital, stats.max)} unit={stats.max != null ? vital.unit : ''} />
      </StatRow>
    </article>
  );
}

export const VitalCard = memo(VitalCardComponent);
