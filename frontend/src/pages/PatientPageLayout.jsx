import { POLL_INTERVAL_MS } from '../config';
import { formatSeconds } from '../utils/formatters';
import { EmptyState } from '../components/dashboard/EmptyState';
import { ErrorState, StaleDataBanner } from '../components/dashboard/ErrorState';
import { PatientHeader } from '../components/dashboard/PatientHeader';
import { PatientHeaderSkeleton } from '../components/ui/Skeleton';

/**
 * Estrutura comum às páginas de um paciente: título, estados de vazio,
 * carregamento e erro, e cabeçalho do paciente.
 *
 * @param {{
 *   title: string,
 *   subtitle: string,
 *   query: ReturnType<typeof import('../hooks/usePatientDashboard').usePatientDashboard>,
 *   patientId: string | null,
 *   skeleton: import('react').ReactNode,
 *   children: (dashboard: import('../domain/normalize').PatientDashboard) => import('react').ReactNode,
 * }} props
 */
export function PatientPageLayout({ title, subtitle, query, patientId, skeleton, children }) {
  const { data, error, status, lastSuccessAt, refetch } = query;

  let content;
  if (!patientId) {
    content = <EmptyState />;
  } else if (data) {
    content = (
      <>
        {status === 'offline' && <StaleDataBanner error={error} lastSuccessAt={lastSuccessAt} onRetry={refetch} />}
        <PatientHeader dashboard={data} status={status} lastSuccessAt={lastSuccessAt} />
        {children(data)}
        <p className="pb-6 text-center text-label-md text-on-surface-variant">
          Atualização automática a cada {formatSeconds(POLL_INTERVAL_MS)}
        </p>
      </>
    );
  } else if (status === 'offline') {
    content = <ErrorState error={error} onRetry={refetch} />;
  } else {
    content = (
      <>
        <PatientHeaderSkeleton />
        {skeleton}
      </>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 p-4 pb-24 md:p-10">
      <div>
        <h2 className="text-headline-lg text-on-surface md:text-headline-xl">{title}</h2>
        <p className="mt-1 text-body-md text-on-surface-variant">{subtitle}</p>
      </div>
      {content}
    </main>
  );
}
