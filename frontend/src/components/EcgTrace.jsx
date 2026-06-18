const CELL_WIDTH = 100;
const CELLS = 7;
const HEARTBEAT_PATH =
  "M0,30 L10,30 L14,24 L18,30 L26,30 L29,40 L32,4 L35,46 L38,30 L50,30 L54,18 L60,30 L100,30";

export default function EcgTrace({ bpm, hasSignal }) {
  const duration = hasSignal && bpm > 0 ? Math.min(3.4, Math.max(0.6, 2.2 * (70 / bpm))) : 0;

  return (
    <div className={`ecg-trace ${hasSignal ? "" : "ecg-trace--flat"}`}>
      <svg
        viewBox={`0 0 ${CELL_WIDTH * CELLS} 60`}
        preserveAspectRatio="none"
        className="ecg-trace__svg"
      >
        <g className="ecg-trace__group">
          {Array.from({ length: CELLS + 1 }).map((_, index) => (
            <path
              key={index}
              d={hasSignal ? HEARTBEAT_PATH : "M0,30 L100,30"}
              transform={`translate(${index * CELL_WIDTH}, 0)`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {hasSignal && (
            <animateTransform
              attributeName="transform"
              type="translate"
              from="0 0"
              to={`${-CELL_WIDTH} 0`}
              dur={`${duration}s`}
              repeatCount="indefinite"
            />
          )}
        </g>
      </svg>
      <span className="ecg-trace__label">
        {hasSignal ? `${bpm} bpm` : "Sem leitura de FC"}
      </span>
    </div>
  );
}
