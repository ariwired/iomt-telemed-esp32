export default function Sparkline({ values, color, width = 120, height = 36 }) {
  const clean = values.filter((v) => v !== null && v !== undefined);

  if (clean.length < 2) {
    return (
      <svg className="sparkline" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <line
          x1="0"
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="var(--text-muted)"
          strokeWidth="1.5"
          strokeDasharray="3 4"
        />
      </svg>
    );
  }

  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const range = max - min || 1;
  const padding = 4;

  const points = clean.map((value, index) => {
    const x = (index / (clean.length - 1)) * width;
    const normalized = (value - min) / range;
    const y = height - padding - normalized * (height - padding * 2);
    return [x, y];
  });

  const path = points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [lastX, lastY] = points[points.length - 1];

  return (
    <svg className="sparkline" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="2.5" fill={color} />
    </svg>
  );
}
