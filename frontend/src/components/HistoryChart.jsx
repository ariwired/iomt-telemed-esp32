import { useState } from "react";
import { formatTimestamp } from "../utils/formatters";

const METRICS = [
  {
    key: "spo2",
    label: "SpO2",
    unit: "%",
    color: "var(--accent-spo2)",
    decimals: 0,
    thresholds: [{ value: 90, label: "limite crítico" }, { value: 95, label: "limite de atenção" }]
  },
  {
    key: "frequenciaCardiaca",
    label: "Frequência cardíaca",
    unit: "bpm",
    color: "var(--accent-hr)",
    decimals: 0,
    thresholds: [{ value: 50, label: "mínimo" }, { value: 110, label: "máximo" }]
  },
  {
    key: "temperatura",
    label: "Temperatura",
    unit: "°C",
    color: "var(--accent-temp)",
    decimals: 1,
    thresholds: [{ value: 37.5, label: "febre" }, { value: 38.5, label: "febre alta" }]
  },
  {
    key: "riskScore",
    label: "Score de risco",
    unit: "",
    color: "var(--risk-high)",
    decimals: 2,
    thresholds: [{ value: 0.5, label: "alto" }, { value: 0.75, label: "crítico" }]
  }
];

const CHART_WIDTH = 640;
const CHART_HEIGHT = 220;
const PADDING = { top: 16, right: 16, bottom: 28, left: 40 };

export default function HistoryChart({ series }) {
  const [metricKey, setMetricKey] = useState("spo2");
  const metric = METRICS.find((m) => m.key === metricKey);

  const chronological = [...series].reverse();

  const points = chronological
    .map((reading, index) => ({ index, value: reading[metric.key], timestamp: reading.timestamp }))
    .filter((point) => point.value !== null && point.value !== undefined);

  if (points.length < 2) {
    return (
      <section className="history-chart">
        <ChartTabs metricKey={metricKey} onChange={setMetricKey} />
        <div className="history-chart__empty">
          Histórico insuficiente para exibir o gráfico de {metric.label.toLowerCase()}. Aguardando mais leituras…
        </div>
      </section>
    );
  }

  const values = points.map((p) => p.value);
  const relevantThresholds = metric.thresholds.filter(
    (t) => t.value >= Math.min(...values) - (Math.max(...values) - Math.min(...values) || 1) * 0.4 &&
      t.value <= Math.max(...values) + (Math.max(...values) - Math.min(...values) || 1) * 0.4
  );

  const allValues = [...values, ...relevantThresholds.map((t) => t.value)];
  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const span = rawMax - rawMin || 1;
  const min = rawMin - span * 0.12;
  const max = rawMax + span * 0.12;

  const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  const xFor = (index) => PADDING.left + (index / (chronological.length - 1)) * plotWidth;
  const yFor = (value) => PADDING.top + (1 - (value - min) / (max - min)) * plotHeight;

  const linePath = points
    .map((point, i) => `${i === 0 ? "M" : "L"}${xFor(point.index).toFixed(1)},${yFor(point.value).toFixed(1)}`)
    .join(" ");

  const gridValues = [min + (max - min) * 0.2, min + (max - min) * 0.5, min + (max - min) * 0.8];

  const firstPoint = chronological[0];
  const lastPoint = chronological[chronological.length - 1];

  return (
    <section className="history-chart">
      <div className="history-chart__head">
        <ChartTabs metricKey={metricKey} onChange={setMetricKey} />
        <span className="history-chart__count">{chronological.length} leituras</span>
      </div>

      <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="history-chart__svg" preserveAspectRatio="none">
        {gridValues.map((value) => (
          <g key={value}>
            <line
              x1={PADDING.left}
              x2={CHART_WIDTH - PADDING.right}
              y1={yFor(value)}
              y2={yFor(value)}
              className="history-chart__grid-line"
            />
            <text x={PADDING.left - 8} y={yFor(value)} className="history-chart__grid-label" textAnchor="end" dy="3">
              {value.toFixed(metric.decimals)}
            </text>
          </g>
        ))}

        {relevantThresholds.map((t) => (
          <line
            key={t.value}
            x1={PADDING.left}
            x2={CHART_WIDTH - PADDING.right}
            y1={yFor(t.value)}
            y2={yFor(t.value)}
            className="history-chart__threshold-line"
          />
        ))}

        <path d={linePath} fill="none" stroke={metric.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

        {points.map((point) => (
          <circle key={point.index} cx={xFor(point.index)} cy={yFor(point.value)} r="2.5" fill={metric.color} />
        ))}

        <text x={PADDING.left} y={CHART_HEIGHT - 8} className="history-chart__axis-label">
          {formatTimestamp(firstPoint.timestamp)}
        </text>
        <text x={CHART_WIDTH - PADDING.right} y={CHART_HEIGHT - 8} className="history-chart__axis-label" textAnchor="end">
          {formatTimestamp(lastPoint.timestamp)}
        </text>
      </svg>
    </section>
  );
}

function ChartTabs({ metricKey, onChange }) {
  return (
    <div className="history-chart__tabs" role="tablist" aria-label="Selecionar sinal vital do histórico">
      {METRICS.map((m) => (
        <button
          key={m.key}
          type="button"
          role="tab"
          aria-selected={m.key === metricKey}
          className={m.key === metricKey ? "is-active" : ""}
          onClick={() => onChange(m.key)}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
