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
import { RISK_LEVELS, RISK_LEVEL_ORDER, RISK_SOURCES } from '../../domain/vitals';
import { computeTimeDomain } from '../../domain/series';
import { formatPercent } from '../../utils/formatters';
import { ChartEmpty } from './ChartEmpty';
import { ChartTooltip } from './ChartTooltip';
import { AXIS_TICK, CHART_MARGIN, GRID_PROPS, TIME_AXIS_PROPS } from './chartTheme';

const Y_TICKS = [0, 0.25, 0.5, 0.75, 1];
const MAX_RANK = RISK_LEVELS[RISK_LEVEL_ORDER.at(-1)].rank;

function RiskDot({ cx, cy, payload, r = 3 }) {
  if (cx == null || cy == null || !payload) return null;
  const color = RISK_LEVELS[payload.level]?.color ?? COLORS.neutral;
  return <circle cx={cx} cy={cy} r={r} fill={color} />;
}

function TooltipContent({ point }) {
  const level = RISK_LEVELS[point.level]?.label ?? '—';
  const source = RISK_SOURCES[point.source];
  return (
    <>
      <div>Risco {level.toLowerCase()}</div>
      <div className="font-normal text-on-surface-variant">
        Gravidade {formatPercent(point.score)}
        {point.confidence != null && ` · confiança ${formatPercent(point.confidence)}`}
      </div>
      {source && <div className="font-normal text-outline">{source.label}</div>}
    </>
  );
}

/**
 * Evolução da gravidade do risco (0% = baixo, 100% = crítico). Cada ponto é
 * colorido pelo nível previsto. Avaliações antigas sem gravidade conhecida são
 * posicionadas pelo nível.
 */
function RiskChartComponent({ series, height = 160 }) {
  const data = useMemo(
    () => series.map((p) => ({ ...p, value: p.score ?? p.rank / MAX_RANK })),
    [series],
  );
  const xDomain = useMemo(() => computeTimeDomain(series), [series]);

  if (!series.length) {
    return <ChartEmpty height={height} message="Nenhuma avaliação de risco ainda" />;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={CHART_MARGIN}>
        <CartesianGrid {...GRID_PROPS} />
        <XAxis {...TIME_AXIS_PROPS} domain={xDomain} />
        <YAxis
          type="number"
          domain={[0, 1]}
          ticks={Y_TICKS}
          interval={0}
          tickFormatter={formatPercent}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <Tooltip
          content={<ChartTooltip render={(point) => <TooltipContent point={point} />} />}
          cursor={{ stroke: COLORS.risk, strokeWidth: 1, strokeDasharray: '4 2', opacity: 0.5 }}
          isAnimationActive={false}
        />
        <Line
          type="linear"
          dataKey="value"
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
