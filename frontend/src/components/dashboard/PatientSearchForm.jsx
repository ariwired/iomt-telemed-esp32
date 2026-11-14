import { useEffect, useRef, useState } from 'react';
import { Icon } from '../ui/Icon';

/**
 * Campo de busca por ID de paciente. Aberto quando não há paciente selecionado;
 * recolhido em um botão depois da seleção.
 *
 * Renderize com `key={currentId}` para reiniciar o estado ao trocar de paciente.
 */
export function PatientSearchForm({ currentId, onSearch, disabled = false }) {
  const [value, setValue] = useState(currentId ?? '');
  const [expanded, setExpanded] = useState(!currentId);
  const inputRef = useRef(null);

  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  const trimmed = value.trim();

  function handleSubmit(event) {
    event.preventDefault();
    if (!trimmed) return;
    onSearch(trimmed);
    setExpanded(false);
  }

  function collapse() {
    if (!currentId) return;
    setValue(currentId);
    setExpanded(false);
  }

  function handleBlur(event) {
    // Não recolhe ao clicar no botão "Buscar" do próprio formulário.
    if (event.currentTarget.contains(event.relatedTarget)) return;
    if (trimmed === '' || trimmed === currentId) collapse();
  }

  if (!expanded) {
    return (
      <button
        type="button"
        title="Trocar paciente"
        aria-label="Trocar paciente"
        onClick={() => setExpanded(true)}
        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-surface-variant bg-surface-container-high text-on-surface-variant transition-colors hover:text-primary"
      >
        <Icon name="search" />
      </button>
    );
  }

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      onBlur={handleBlur}
      onKeyDown={(e) => e.key === 'Escape' && collapse()}
      className="flex w-full max-w-sm animate-fade-in gap-2.5"
    >
      <label className="relative flex-1">
        <span className="sr-only">ID do paciente</span>
        <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" />
        <input
          ref={inputRef}
          type="text"
          inputMode="text"
          autoComplete="off"
          disabled={disabled}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="ID do paciente"
          className="h-11 w-full rounded-2xl border border-outline-variant bg-surface-container pl-10.5 pr-4 text-body-md text-on-surface outline-none placeholder:text-outline focus:border-primary-fixed-dim"
        />
      </label>
      <button
        type="submit"
        disabled={disabled || !trimmed}
        className="h-11 rounded-2xl bg-primary-container px-4.5 font-semibold text-on-primary transition-opacity disabled:cursor-not-allowed disabled:opacity-45"
      >
        Buscar
      </button>
    </form>
  );
}
