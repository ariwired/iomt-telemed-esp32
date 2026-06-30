import React from 'react';

const DOT_MAP = {
  online:  { color: '#7be29d', glow: 'rgba(123,226,157,0.45)', pulse: false },
  offline: { color: '#ff5449', glow: 'rgba(255,84,73,0.35)',   pulse: false },
  loading: { color: '#ffd080', glow: 'rgba(255,208,128,0.4)',  pulse: true  },
  idle:    { color: '#575757', glow: 'transparent',            pulse: false },
};

export function StatusDot({ status, size = 8 }) {
  const { color, glow, pulse } = DOT_MAP[status] ?? DOT_MAP.idle;
  return (
    <span
      className={pulse ? 'animate-pulse' : undefined}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: color,
        boxShadow: `0 0 8px ${glow}`,
        flexShrink: 0,
      }}
    />
  );
}