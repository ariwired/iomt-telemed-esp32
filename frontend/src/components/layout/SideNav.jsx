import { PAGES } from '../../navigation';
import { Icon } from '../ui/Icon';

function NavButton({ icon, label, active, onClick, compact = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={[
        'flex items-center rounded-xl transition-colors duration-150 active:scale-95',
        compact ? 'flex-1 flex-col gap-0.5 py-2' : 'w-full gap-3 px-3 py-3 text-left',
        active
          ? 'bg-primary-container text-on-primary-container'
          : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface',
      ].join(' ')}
    >
      <Icon name={icon} size={compact ? 22 : 20} />
      <span className={compact ? 'text-label-md' : 'text-body-md font-medium'}>{label}</span>
    </button>
  );
}

/** Navegação lateral (desktop) e barra inferior (mobile). */
export function SideNav({ activePage, onNavigate }) {
  const entries = Object.entries(PAGES);

  return (
    <>
      <nav
        aria-label="Navegação principal"
        className="fixed left-0 top-0 z-20 hidden h-full w-[280px] flex-col gap-6 border-r border-surface-variant bg-surface-container p-4 md:flex"
      >
        <div className="flex items-center gap-3 px-3 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
            <Icon name="monitor_heart" size={18} />
          </div>
          <div>
            <h1 className="text-headline-md font-bold leading-tight text-primary">IoMT Telemed</h1>
            <p className="text-label-md text-on-surface-variant">Monitoramento Pós-Operatório</p>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          {entries.map(([page, { icon, label }]) => (
            <NavButton
              key={page}
              icon={icon}
              label={label}
              active={page === activePage}
              onClick={() => onNavigate(page)}
            />
          ))}
        </div>
      </nav>

      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-20 flex gap-2 border-t border-surface-variant bg-surface-container px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden"
      >
        {entries.map(([page, { icon, label }]) => (
          <NavButton
            key={page}
            compact
            icon={icon}
            label={label}
            active={page === activePage}
            onClick={() => onNavigate(page)}
          />
        ))}
      </nav>
    </>
  );
}
