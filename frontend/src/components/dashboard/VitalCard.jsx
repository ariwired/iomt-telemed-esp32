import React, { useMemo } from 'react';
import { DetailedChart } from './DetailedChart';
import { STATUS_META } from '../../constants/vitals';
import { computeStats } from '../../utils/formatters';

function TrendIndicator({ delta, config }) {
  if (delta == null) return null;

  const absVal   = Math.abs(delta);
  const isStable = absVal < 0.001;

  if (isStable) {
    return (
      <div className="flex items-center gap-1 text-on-surface-variant">
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>trending_flat</span>
        <span className="text-label-md">estável</span>
      </div>
    );
  }

  const isUp = delta > 0;
  const icon  = isUp ? 'trending_up' : 'trending_down';
  const sign  = isUp ? '+' : '−';

  let color;
  if (config.positiveIsBetter === true)       color = isUp ? '#98ffb8' : '#ffb4ab';
  else if (config.positiveIsBetter === false)  color = isUp ? '#ffb4ab' : '#98ffb8';
  else                                         color = '#bdcabd';

  return (
    <div className="flex items-center gap-1" style={{ color }}>
      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{icon}</span>
      <span className="text-label-md font-medium">
        {sign}{config.format(absVal)}
      </span>
    </div>
  );
}

function StatCell({ label, rawValue, config }) {
  const displayValue = (() => {
    if (rawValue == null) return '—';
    const normalized = config.isInteger ? Math.round(rawValue) : rawValue;
    return config.format(normalized);
  })();

  const showUnit = config.unit && !displayValue.includes(config.unit);

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-label-md text-on-surface-variant">{label}</span>
      <span className="text-body-md text-on-surface font-medium">
        {displayValue}
        {showUnit && (
          <span className="text-on-surface-variant text-label-md ml-0.5">
            {config.unit}
          </span>
        )}
      </span>
    </div>
  );
}

export function VitalCard({ config, currentValue, series }) {
  const status = config.getStatus(currentValue);
  const meta   = STATUS_META[status];
  const stats  = useMemo(() => computeStats(series, config.key), [series, config.key]);

  return (
    <div className="bg-surface-container rounded-xl p-6 flex flex-col gap-5 border border-transparent hover:border-surface-variant transition-colors duration-200 group">

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="p-2.5 rounded-lg bg-surface-container-high group-hover:brightness-90 transition-colors duration-200 flex-shrink-0"
            style={{ color: config.color }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              {config.icon}
            </span>
          </div>

          <div>
            <p className="text-label-md text-on-surface-variant uppercase tracking-widest">
              {config.label}
            </p>
            <div className="flex items-end gap-1.5 leading-none mt-1">
              <span className="text-[28px] font-bold leading-none" style={{ color: config.color }}>
                {config.format(currentValue)}
              </span>
              {config.unit && (
                <span className="text-body-md text-on-surface-variant mb-0.5">
                  {config.unit}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <span className={`text-label-md uppercase tracking-widest ${meta.textClass}`}>
              {meta.label}
            </span>
            <span
              style={{
                display: 'inline-block',
                width: 7,
                height: 7,
                borderRadius: '50%',
                backgroundColor: meta.color,
                boxShadow: `0 0 6px ${meta.color}99`,
                flexShrink: 0,
              }}
            />
          </div>

          <TrendIndicator delta={stats.delta} config={config} />
        </div>
      </div>

      <DetailedChart
        series={series}
        dataKey={config.key}
        color={config.color}
        normalRange={config.normalRange}
        formatter={config.format}
        height={160}
        skipFilledPoints={config.skipFilledPoints ?? false}
      />

      <div className="flex items-center justify-between pt-3 border-t border-surface-variant">
        <StatCell label="Mín"   rawValue={stats.min} config={config} />
        <div className="w-px h-7 bg-surface-variant self-center" />
        <StatCell label="Média" rawValue={stats.avg} config={config} />
        <div className="w-px h-7 bg-surface-variant self-center" />
        <StatCell label="Máx"   rawValue={stats.max} config={config} />
      </div>

    </div>
  );
}