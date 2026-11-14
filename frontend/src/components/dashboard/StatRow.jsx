import { Children, Fragment } from 'react';

export function StatCell({ label, value, unit }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-label-md text-on-surface-variant">{label}</span>
      <span className="text-body-md font-medium tabular-nums text-on-surface">
        {value}
        {unit && <span className="ml-0.5 text-label-md text-on-surface-variant">{unit}</span>}
      </span>
    </div>
  );
}

/** Linha de estatísticas com divisores verticais entre os itens. */
export function StatRow({ children }) {
  const items = Children.toArray(children);
  return (
    <div className="flex items-center justify-between border-t border-surface-variant pt-3">
      {items.map((child, i) => (
        <Fragment key={child.key ?? i}>
          {i > 0 && <div className="h-7 w-px self-center bg-surface-variant" />}
          {child}
        </Fragment>
      ))}
    </div>
  );
}
