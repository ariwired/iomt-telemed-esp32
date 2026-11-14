import { memo, useMemo } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { COLORS } from '../../theme';
import { RISK_LEVELS, riskLevelFromRank } from '../../domain/vitals';
import { computeTimeDomain } from '../../domain/series';
import { ChartEmpty } from './ChartEmpty';
import { ChartTooltip } from './ChartTooltip';
import { AXIS_TICK, CHART_MARGIN, GRID_PROPS, TIME_AXIS_PROPS } from './chartTheme';

const RANKS = Object.values(RISK_LEVELS).map((l) => l.rank);
const Y_DOMAIN = [Math.min(...RANKS), Math.max(...RANKS)];

function rankLabel(rank) {
  const key = riskLevelFromRank(rank);
  return key ? RISK_LEVELS[key].label : '';
}

function RiskDot({ cx, cy, payload, r = 3 }) {
  if (cx == null || cy == null || !payload) return null;
  const color = RISK_LEVELS[payload.level]?.color ?? COLORS.neutral;
  return <circle cx={cx} cy={cy} r={r} fill={color} />;
}

function tooltipText(point) {
  const label = RISK_LEVELS[point.level]?.label ?? '—';
  return `Risco ${label.toLowerCase()}`;
}

/**
 * Evolução do nível de risco. O eixo Y é ordinal (Baixo → Crítico) porque o
 * `riskScore` do modelo é a confiança na classe prevista, não a intensidade do
 * risco: um "Baixo" com 95% de confiança não é mais grave que um "Alto" com 60%.
 */
function RiskChartComponent({ series, height = 160 }) {
  const xDomain = useMemo(() => computeTimeDomain(series), [series]);

  if (!series.length) {
    return <ChartEmpty height={height} message="Nenhuma avaliação de risco ainda" />;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={series} margin={CHART_MARGIN}>
        <CartesianGrid {...GRID_PROPS} />
        <XAxis {...TIME_AXIS_PROPS} domain={xDomain} />
        <YAxis
          dataKey="rank"
          type="number"
          domain={Y_DOMAIN}
          ticks={RANKS}
          interval={0}
          tickFormatter={rankLabel}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={52}
        />
        <Tooltip
          content={<ChartTooltip render={tooltipText} />}
          cursor={{ stroke: COLORS.risk, strokeWidth: 1, strokeDasharray: '4 2', opacity: 0.5 }}
          isAnimationActive={false}
        />
        <Line
          type="stepAfter"
          dataKey="rank"
          stroke={COLORS.risk}
          strokeOpacity={0.6}
          strokeWidth={2}
          dot={<RiskDot />}
          activeDot={<RiskDot r={5} />}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export const RiskChart = memo(RiskChartComponent);
