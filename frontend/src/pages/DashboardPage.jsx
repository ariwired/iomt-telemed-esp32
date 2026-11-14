import { MetricsGrid, MetricsGridSkeleton } from '../components/dashboard/MetricsGrid';
import { PatientPageLayout } from './PatientPageLayout';

export function DashboardPage({ patientId, query }) {
  return (
    <PatientPageLayout
      title="Monitoramento Pós-Operatório"
      subtitle="Sinais vitais em tempo real com análise de risco por IA."
      patientId={patientId}
      query={query}
      skeleton={<MetricsGridSkeleton />}
    >
      {(dashboard) => <MetricsGrid dashboard={dashboard} />}
    </PatientPageLayout>
  );
}
