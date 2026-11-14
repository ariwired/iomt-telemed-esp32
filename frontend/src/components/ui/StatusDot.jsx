import { Dot } from './Dot';

const CONNECTION_COLORS = {
  online:  { color: '#7be29d', pulse: false },
  offline: { color: '#ff5449', pulse: false },
  loading: { color: '#ffd080', pulse: true },
  idle:    { color: '#575757', pulse: false },
};

/** Indicador do estado da conexão com a API. */
export function StatusDot({ status, size = 8 }) {
  const { color, pulse } = CONNECTION_COLORS[status] ?? CONNECTION_COLORS.idle;
  return <Dot color={color} size={size} pulse={pulse} glow={status !== 'idle'} />;
}
