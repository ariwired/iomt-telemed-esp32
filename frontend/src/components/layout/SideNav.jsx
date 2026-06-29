import React from 'react';

const NAV_ITEMS = [
  { icon: 'dashboard',     label: 'Visão Geral',   page: null          },
  { icon: 'monitor_heart', label: 'Monitoramento', page: 'monitoring'  },
  { icon: 'history',       label: 'Histórico',     page: 'history'     },
  { icon: 'person_search', label: 'Pacientes',     page: null          },
  { icon: 'settings',      label: 'Sistema',       page: null          },
];

export function SideNav({ activePage, onNavigate }) {
  return (
    <nav className="hidden md:flex flex-col h-full w-[280px] bg-surface-container fixed left-0 top-0 p-4 gap-6 border-r border-surface-variant z-20">
      {/* Brand */}
      <div className="flex items-center gap-3 px-3 py-3">
        <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-on-primary-container" style={{ fontSize: 18 }}>
            monitor_heart
          </span>
        </div>
        <div>
          <h1 className="text-headline-md font-bold text-primary leading-tight">IoMT Telemed</h1>
          <p className="text-label-md text-on-surface-variant">Monitoramento Pós-Operatório</p>
        </div>
      </div>

      {/* Links */}
      <div className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive   = item.page === activePage;
          const isDisabled = item.page == null;

          return (
            <button
              key={item.label}
              onClick={!isDisabled ? () => onNavigate(item.page) : undefined}
              disabled={isDisabled}
              className={[
                'flex items-center gap-3 px-3 py-3 rounded-xl w-full text-left',
                'transition-all duration-150',
                isActive
                  ? 'bg-primary-container text-on-primary-container'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high',
                isDisabled
                  ? 'opacity-35 cursor-not-allowed'
                  : 'cursor-pointer active:scale-95',
              ].join(' ')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                {item.icon}
              </span>
              <span className="text-body-md font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}