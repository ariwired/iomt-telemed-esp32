import React from 'react';
import { RISK_LEVEL_META } from '../../constants/vitals';

export function RiskBadge({ riskLevel, large = false }) {
  const meta = RISK_LEVEL_META[riskLevel];
  if (!meta) return null;

  return (
    <div
      className={[
        'inline-flex items-center gap-2 rounded-full font-bold tracking-widest',
        meta.bgClass,
        meta.textClass,
        large ? 'px-4 py-2 text-body-md' : 'px-3 py-1.5 text-label-md',
      ].join(' ')}
    >
      <span
        style={{
          display: 'inline-block',
          width: large ? 10 : 8,
          height: large ? 10 : 8,
          borderRadius: '50%',
          backgroundColor: meta.dot,
          boxShadow: `0 0 8px ${meta.dot}88`,
          flexShrink: 0,
        }}
      />
      RISCO {meta.label}
    </div>
  );
}