/** Ícone do Material Symbols. Decorativo por padrão (escondido de leitores de tela). */
export function Icon({ name, size = 20, className = '', label }) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{ fontSize: size }}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
    >
      {name}
    </span>
  );
}
