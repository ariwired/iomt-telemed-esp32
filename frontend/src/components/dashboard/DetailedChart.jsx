import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { prepareChartData } from '../../utils/formatters';

function formatXTick(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function DetailedTooltip({ active, payload, formatter }) {
  if (!active || !payload?.length) return null;
  const { value, ts } = payload[0]?.payload ?? {};

  return (
    <div
      style={{
        background: '#201f1f',
        border: '1px solid #3e4a40',
        borderRadius: 8,
        padding: '6px 10px',
        fontSize: 12,
        color: '#e5e2e1',
        lineHeight: '20px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
      }}
    >
      {ts && (
        <div style={{ color: '#889488', fontSize: 10, marginBottom: 2 }}>
          {new Date(ts).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </div>
      )}
      <div style={{ fontWeight: 600 }}>
        {formatter ? formatter(value) : value}
      </div>
    </div>
  );
}

export function DetailedChart({
  series,
  dataKey,
  color,
  normalRange,
  formatter,
  height = 160,
  skipFilledPoints = false,
}) {
  const data = useMemo(
    () => prepareChartData(series, dataKey, 40, { skipFilled: skipFilledPoints }),
    [series, dataKey, skipFilledPoints],
  );

  if (!data.length) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 rounded-lg bg-surface-container-high text-label-md text-on-surface-variant"
        style={{ height }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 24, opacity: 0.5 }}>
          show_chart
        </span>
        <span>Sem dados históricos</span>
      </div>
    );
  }

  const values  = data.map((d) => d.value);
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const spread  = dataMax - dataMin || 1;
  const pad     = spread * 0.25;
  const yMin    = Math.floor(Math.min(dataMin - pad, normalRange?.[0] ?? dataMin));
  const yMax    = Math.ceil(Math.max(dataMax + pad,  normalRange?.[1] ?? dataMax));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>

        <CartesianGrid
          stroke="#3e4a40"
          strokeDasharray="4 4"
          vertical={false}
          strokeOpacity={0.45}
        />

        <XAxis
          dataKey="ts"
          tickFormatter={formatXTick}
          tick={{ fontSize: 10, fill: '#889488' }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={52}
        />

        <YAxis
          domain={[yMin, yMax]}
          tick={{ fontSize: 10, fill: '#889488' }}
          tickLine={false}
          axisLine={false}
          width={40}
          tickFormatter={(v) => (formatter ? formatter(v) : v)}
        />

        {normalRange && (
          <ReferenceArea
            y1={normalRange[0]}
            y2={normalRange[1]}
            fill={color}
            fillOpacity={0.07}
            stroke="none"
          />
        )}

        {normalRange?.[0] != null && (
          <ReferenceLine
            y={normalRange[0]}
            stroke={color}
            strokeWidth={1}
            strokeDasharray="4 4"
            strokeOpacity={0.35}
          />
        )}

        {normalRange?.[1] != null && (
          <ReferenceLine
            y={normalRange[1]}
            stroke={color}
            strokeWidth={1}
            strokeDasharray="4 4"
            strokeOpacity={0.35}
          />
        )}

        <Tooltip
          content={<DetailedTooltip formatter={formatter} />}
          cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '4 2', opacity: 0.5 }}
        />

        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={{ r: 2.5, fill: color, strokeWidth: 0, fillOpacity: 0.65 }}
          activeDot={{ r: 4.5, fill: color, strokeWidth: 0 }}
          isAnimationActive
          animationDuration={900}
          animationEasing="ease-out"
        />

      </LineChart>
    </ResponsiveContainer>
  );
}