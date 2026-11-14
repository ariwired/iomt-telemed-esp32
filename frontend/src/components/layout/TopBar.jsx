import { useNow } from '../../hooks/useNow';
import { formatRelativeTime } from '../../utils/formatters';
import { PatientSearchForm } from '../dashboard/PatientSearchForm';
import { Icon } from '../ui/Icon';
import { StatusDot } from '../ui/StatusDot';

const STATUS_LABELS = {
  idle: 'Aguardando',
  loading: 'Sincronizando',
  online: 'Online',
  offline: 'Offline',
};

export function TopBar({ title, status, lastSuccessAt, onRefetch, patientId, onPatientSearch }) {
  const now = useNow();

  return (
    <header className="sticky top-0 z-10 flex w-full flex-wrap items-center justify-between gap-3 border-b border-surface-variant bg-surface px-4 py-4 md:px-10">
      <div className="flex min-w-0 flex-1 items-center gap-5">
        <span className="hidden text-headline-md font-bold tracking-tight text-on-surface sm:inline">{title}</span>
        <PatientSearchForm
          key={patientId ?? ''}
          currentId={patientId}
          onSearch={onPatientSearch}
          disabled={status === 'loading' && !lastSuccessAt}
        />
      </div>

      <div className="flex items-center gap-3">
        <div
          className="flex items-center gap-2 rounded-full bg-surface-container-high px-3 py-1.5"
          role="status"
          aria-live="polite"
        >
          <StatusDot status={status} />
          <span className="text-label-md uppercase tracking-widest text-on-surface">
            {STATUS_LABELS[status] ?? status}
          </span>
          {lastSuccessAt && (
            <span className="hidden text-label-md text-on-surface-variant sm:inline">
              · {formatRelativeTime(lastSuccessAt, now)}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onRefetch}
          disabled={!patientId}
          title="Atualizar agora"
          aria-label="Atualizar agora"
          className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary disabled:opacity-35"
        >
          <Icon name="refresh" size={22} />
        </button>
      </div>
    </header>
  );
}
