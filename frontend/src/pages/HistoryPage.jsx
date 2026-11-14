import { ReadingsTable } from '../components/history/ReadingsTable';
import { TableSkeleton } from '../components/ui/Skeleton';
import { PatientPageLayout } from './PatientPageLayout';

export function HistoryPage({ patientId, query }) {
  return (
    <PatientPageLayout
      title="Histórico de Leituras"
      subtitle="Registro de sinais vitais do paciente, do mais recente para o mais antigo."
      patientId={patientId}
      query={query}
      skeleton={<TableSkeleton />}
    >
      {/* key reinicia a paginação somente ao trocar de paciente */}
      {(dashboard) => <ReadingsTable key={dashboard.pacienteId} readings={dashboard.readings} />}
    </PatientPageLayout>
  );
}
