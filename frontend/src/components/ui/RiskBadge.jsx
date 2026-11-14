import { RISK_LEVELS } from '../../domain/vitals';
import { Dot } from './Dot';

const SIZES = {
  sm: { className: 'gap-1.5 px-2 py-0.5 text-label-md font-semibold', dot: 5 },
  md: { className: 'gap-2 px-3 py-1.5 text-label-md font-bold tracking-widest uppercase', dot: 8 },
  lg: { className: 'gap-2 px-4 py-2 text-body-md font-bold tracking-widest uppercase', dot: 10 },
};

/** Selo com o nível de risco. Não renderiza nada para nível desconhecido. */
export function RiskBadge({ riskLevel, size = 'md', prefix = size !== 'sm' ? 'Risco ' : '' }) {
  const meta = RISK_LEVELS[riskLevel];
  if (!meta) return null;
  const { className, dot } = SIZES[size];

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full ${className} ${meta.bgClass} ${meta.textClass}`}
    >
      <Dot color={meta.color} size={dot} glow={size !== 'sm'} />
      {prefix}
      {meta.label}
    </span>
  );
}
