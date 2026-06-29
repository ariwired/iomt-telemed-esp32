import React, { useMemo } from 'react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { prepareChartData } from '../../utils/formatters';

function ChartTooltip({ active, payload, formatter }) {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value;
  return (
    <div
      style={{
        background: '#2a2a2a',
        border: '1px solid #3e4a40',
        borderRadius: 8,
        padding: '4px 10px',
        fontSize: 12,
        color: '#e5e2e1',
        lineHeight: '20px',
      }}
    >
      {formatter ? formatter(value) : value}
    </div>
  );
}

export function SparklineChart({ series, dataKey, color, height = 64, formatter }) {
  const data = useMemo(() => prepareChartData(series, dataKey), [series, dataKey]);

  // Stable gradient id — avoid conflicts when multiple charts render
  const gradientId = `sparkline-grad-${dataKey}`;

  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center text-label-md text-on-surface-variant"
        style={{ height }}
      >
        Sem histórico
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0}   />
          </linearGradient>
        </defs>

        <Tooltip
          content={<ChartTooltip formatter={formatter} />}
          cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '4 2', opacity: 0.6 }}
        />

        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 3, fill: color, strokeWidth: 0 }}
          isAnimationActive
          animationDuration={900}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}