const NAV_ITEMS = [
  { icon: 'dashboard', label: 'Visão Geral' },
  { icon: 'monitor_heart', label: 'Monitoramento', active: true },
  { icon: 'history', label: 'Histórico' },
  { icon: 'person_search', label: 'Pacientes' },
  { icon: 'settings', label: 'Sistema' },
];

export function SideNav() {
  return (
    <nav className="hidden md:flex flex-col h-full w-[280px] bg-surface-container fixed left-0 top-0 p-4 gap-6 border-r border-surface-variant z-20">
      {/* Brand */}
      <div className="flex items-center gap-3 px-3 py-3">
        <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
          <span
            className="material-symbols-outlined text-on-primary-container"
            style={{ fontSize: 18 }}
          >
            monitor_heart
          </span>
        </div>

        <div>
          <h1 className="text-headline-md font-bold text-primary leading-tight">
            IoMT Telemed
          </h1>
          <p className="text-label-md text-on-surface-variant">
            Monitoramento Pós-operatório
          </p>
        </div>
      </div>

      {/* Nav links */}
      <div className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <a
            key={item.label}
            href="#"
            className={[
              'flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer',
              'transition-all duration-150 active:scale-95',
              item.active
                ? 'bg-primary-container text-on-primary-container'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high',
            ].join(' ')}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 20 }}
            >
              {item.icon}
            </span>
            <span className="text-body-md font-medium">
              {item.label}
            </span>
          </a>
        ))}
      </div>
    </nav>
  );
}