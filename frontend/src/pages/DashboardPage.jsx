import React from 'react';
import { PatientHeader }       from '../components/dashboard/PatientHeader';
import { MetricsGrid }         from '../components/dashboard/MetricsGrid';
import { EmptyState }          from '../components/dashboard/EmptyState';
import { ErrorState }          from '../components/dashboard/ErrorState';
import { PatientHeaderSkeleton } from '../components/ui/Skeleton';

export function DashboardPage({ patientId, data, error, status, lastSuccessAt, refetch }) {
  const isInitialLoad = patientId && (status === 'idle' || status === 'loading') && !data;
  const isHardError   = patientId && status === 'offline' && !data;
  const hasData       = data != null;

  return (
    <main className="p-4 md:p-10 max-w-7xl mx-auto w-full flex flex-col gap-8">
      <div>
        <h2 className="text-headline-lg md:text-headline-xl text-on-surface">
          Monitoramento Pós-Operatório
        </h2>
        <p className="text-body-md text-on-surface-variant mt-1">
          Sinais vitais em tempo real com análise de risco por IA.
        </p>
      </div>

      {!patientId && <EmptyState />}

      {isInitialLoad && (
        <>
          <PatientHeaderSkeleton />
          <MetricsGrid currentVitals={null} historicalSeries={[]} loading />
        </>
      )}

      {isHardError && <ErrorState error={error} onRetry={refetch} />}

      {hasData && (
        <>
          <PatientHeader patient={data} status={status} lastSuccessAt={lastSuccessAt} />
          <MetricsGrid
            currentVitals={data.currentVitals}
            historicalSeries={data.historicalSeries}
          />
          <div className="text-center pb-6">
            <p className="text-label-md text-on-surface-variant">
              Atualização automática a cada 4 segundos · fonte:{' '}
              {data.currentVitals?.source ?? '—'}
            </p>
          </div>
        </>
      )}
    </main>
  );
}