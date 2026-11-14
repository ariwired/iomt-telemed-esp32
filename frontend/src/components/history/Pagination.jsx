import { Icon } from '../ui/Icon';

/** Páginas visíveis: primeira, última e vizinhas da atual, com reticências nos saltos. */
function pageWindow(page, totalPages) {
  const items = [];
  let previous = 0;
  for (let p = 1; p <= totalPages; p++) {
    if (p !== 1 && p !== totalPages && Math.abs(p - page) > 1) continue;
    if (p - previous > 1) items.push(`ellipsis-${p}`);
    items.push(p);
    previous = p;
  }
  return items;
}

const NAV_BUTTON =
  'flex items-center gap-1.5 rounded-lg px-4 py-2 text-body-md text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-30';

export function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Paginação" className="flex items-center justify-between">
      <button type="button" disabled={page === 1} onClick={() => onChange(page - 1)} className={NAV_BUTTON}>
        <Icon name="arrow_back" size={18} />
        Anterior
      </button>

      <div className="flex items-center gap-1">
        {pageWindow(page, totalPages).map((item) =>
          typeof item === 'string' ? (
            <span key={item} className="px-1 text-body-md text-on-surface-variant">
              …
            </span>
          ) : (
            <button
              type="button"
              key={item}
              onClick={() => onChange(item)}
              aria-current={item === page ? 'page' : undefined}
              className={[
                'h-8 w-8 rounded-lg text-body-md font-medium transition-colors',
                item === page
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface',
              ].join(' ')}
            >
              {item}
            </button>
          ),
        )}
      </div>

      <button
        type="button"
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
        className={NAV_BUTTON}
      >
        Próxima
        <Icon name="arrow_forward" size={18} />
      </button>
    </nav>
  );
}
