/** Indicador circular colorido, com brilho opcional. */
export function Dot({ color, size = 8, glow = false, pulse = false }) {
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 rounded-full ${pulse ? 'animate-pulse' : ''}`}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        boxShadow: glow ? `0 0 ${size}px ${color}88` : undefined,
      }}
    />
  );
}
