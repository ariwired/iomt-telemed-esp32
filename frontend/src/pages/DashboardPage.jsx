import React, { useState } from "react";

import { SideNav } from "../components/layout/SideNav";
import { TopBar } from "../components/layout/TopBar";

import { PatientHeader } from "../components/dashboard/PatientHeader";
import { MetricsGrid } from "../components/dashboard/MetricsGrid";
import { EmptyState } from "../components/dashboard/EmptyState";
import { ErrorState } from "../components/dashboard/ErrorState";

import { PatientHeaderSkeleton } from "../components/ui/Skeleton";

import { usePatientDashboard } from "../hooks/usePatientDashboard";

export function DashboardPage() {
  const [patientId, setPatientId] = useState(null);

  const {
    data,
    error,
    status,
    lastSuccessAt,
    refetch,
  } = usePatientDashboard(patientId);

  const isInitialLoad =
    patientId &&
    (status === "idle" || status === "loading") &&
    !data;

  const isHardError =
    patientId &&
    status === "offline" &&
    !data;

  const hasData = data != null;

  return (
    <div className="flex bg-background text-on-surface h-screen overflow-hidden font-sans">

      <SideNav />

      <div className="flex flex-col flex-1 md:ml-[280px] w-full h-full overflow-y-auto scrollbar-thin">

        <TopBar
          status={status}
          lastSuccessAt={lastSuccessAt}
          onRefetch={refetch}
          patientId={patientId}
          onPatientSearch={setPatientId}
        />

        <main className="p-4 md:p-10 max-w-7xl mx-auto w-full flex flex-col gap-8">

          {/* Cabeçalho da página */}

          <div>
            <h2 className="text-headline-lg md:text-headline-xl text-on-surface">
              Monitoramento Pós-Operatório
            </h2>

            <p className="text-body-md text-on-surface-variant mt-1">
              Sinais vitais em tempo real com análise de risco por IA.
            </p>
          </div>

          {/* Nenhum paciente */}

          {!patientId && <EmptyState />}

          {/* Loading inicial */}

          {isInitialLoad && (
            <>
              <PatientHeaderSkeleton />

              <MetricsGrid
                currentVitals={null}
                historicalSeries={[]}
                loading
              />
            </>
          )}

          {/* Erro */}

          {isHardError && (
            <ErrorState
              error={error}
              onRetry={refetch}
            />
          )}

          {/* Dados */}

          {hasData && (
            <>
              <PatientHeader
                patient={data}
                status={status}
                lastSuccessAt={lastSuccessAt}
              />

              <MetricsGrid
                currentVitals={data.currentVitals}
                historicalSeries={data.historicalSeries}
              />

              <div className="text-center pb-6">
                <p className="text-label-md text-on-surface-variant">
                  Atualização automática a cada 4 segundos · fonte:{" "}
                  {data.currentVitals?.source ?? "—"}
                </p>
              </div>
            </>
          )}

        </main>

      </div>

    </div>
  );
}