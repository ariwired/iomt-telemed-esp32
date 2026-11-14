import { memo, useMemo } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatVital } from '../../domain/vitals';
import { breakLongGaps, computeTimeDomain, computeYDomain } from '../../domain/series';
import { ChartEmpty } from './ChartEmpty';
import { ChartTooltip } from './ChartTooltip';
import { AXIS_TICK, CHART_MARGIN, GRID_PROPS, TIME_AXIS_PROPS } from './chartTheme';

/**
 * Gráfico de linha de um sinal vital ao longo do tempo.
 *
 * @param {{ vital: import('../../domain/vitals').VITALS[number], series: { t: number, value: number|null }[], height?: number }} props
 */
function VitalChartComponent({ vital, series, height = 160 }) {
  const data = useMemo(() => breakLongGaps(series), [series]);
  const hasValues = useMemo(() => series.some((p) => p.value != null), [series]);
  const xDomain = useMemo(() => computeTimeDomain(series), [series]);

  const domain = useMemo(
    () =>
      computeYDomain(
        series.map((p) => p.value),
        vital,
      ),
    [series, vital],
  );

  if (!hasValues) return <ChartEmpty height={height} />;

  const formatValue = (v) => formatVital(vital, v);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={CHART_MARGIN}>
        <CartesianGrid {...GRID_PROPS} />
        <XAxis {...TIME_AXIS_PROPS} domain={xDomain} />
        <YAxis
          domain={domain}
          allowDataOverflow
          allowDecimals={vital.decimals > 0}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={40}
          tickFormatter={formatValue}
        />

        <ReferenceArea
          y1={vital.normalRange[0]}
          y2={vital.normalRange[1]}
          fill={vital.color}
          fillOpacity={0.07}
          stroke={vital.color}
          strokeOpacity={0.25}
          strokeDasharray="4 4"
          ifOverflow="hidden"
        />

        <Tooltip
          content={<ChartTooltip render={(p) => `${formatValue(p.value)} ${vital.unit}`} />}
          cursor={{ stroke: vital.color, strokeWidth: 1, strokeDasharray: '4 2', opacity: 0.5 }}
          isAnimationActive={false}
        />

        <Line
          type="monotone"
          dataKey="value"
          stroke={vital.color}
          strokeWidth={2}
          dot={{ r: 2.5, fill: vital.color, strokeWidth: 0, fillOpacity: 0.65 }}
          activeDot={{ r: 4.5, fill: vital.color, strokeWidth: 0 }}
          connectNulls={false}
          // Sem animação: com polling a cada poucos segundos, a animação
          // interpolava pontos entre a série antiga e a nova e mostrava valores
          // que nunca foram lidos.
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export const VitalChart = memo(VitalChartComponent);
