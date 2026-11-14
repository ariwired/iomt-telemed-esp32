import { memo, useMemo } from 'react';
import { COLORS } from '../../theme';
import { RISK_LEVELS, RISK_SOURCES } from '../../domain/vitals';
import { CHART_WINDOW, buildRiskSeries } from '../../domain/series';
import { formatPercent, formatTime } from '../../utils/formatters';
import { RiskChart } from '../charts/RiskChart';
import { Icon } from '../ui/Icon';
import { RiskBadge } from '../ui/RiskBadge';
import { StatCell, StatRow } from './StatRow';

function RiskCardComponent({ readings, latestRisk }) {
  const series = useMemo(() => buildRiskSeries(readings, CHART_WINDOW), [readings]);

  const worst = useMemo(() => {
    let max = null;
    for (const p of series) if (max == null || p.rank > max.rank) max = p;
    return max;
  }, [series]);

  const meta = latestRisk ? RISK_LEVELS[latestRisk.level] : null;

  return (
    <article className="group flex flex-col gap-5 rounded-xl border border-transparent bg-surface-container p-6 transition-colors duration-200 hover:border-surface-variant">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="shrink-0 rounded-lg bg-surface-container-high p-2.5" style={{ color: COLORS.risk }}>
            <Icon name="crisis_alert" />
          </div>
          <div>
            <h3 className="text-label-md uppercase tracking-widest text-on-surface-variant">Risco clínico (IA)</h3>
            <p
              className="mt-1 text-[28px] font-bold leading-none"
              style={{ color: meta?.color ?? COLORS.onSurfaceVariant }}
            >
              {meta?.label ?? '—'}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2 text-label-md text-on-surface-variant">
          {latestRisk ? (
            <>
              <span>avaliado às {formatTime(latestRisk.t)}</span>
              {RISK_SOURCES[latestRisk.source] && (
                <span className="rounded-full bg-surface-container-high px-2 py-0.5 uppercase tracking-wide">
                  {RISK_SOURCES[latestRisk.source].label}
                </span>
              )}
            </>
          ) : (
            <span>aguardando análise</span>
          )}
        </div>
      </header>

      <RiskChart series={series} />

      <StatRow>
        <StatCell label="Gravidade atual" value={formatPercent(latestRisk?.score)} />
        <StatCell
          label="Confiança do modelo"
          value={latestRisk?.source === 'LOCAL_RULES' ? 'n/a' : formatPercent(latestRisk?.confidence)}
        />
        <StatCell label="Pior nível" value={worst ? <RiskBadge riskLevel={worst.level} size="sm" /> : '—'} />
      </StatRow>
    </article>
  );
}

export const RiskCard = memo(RiskCardComponent);
