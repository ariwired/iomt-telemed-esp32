import { useState } from 'react';
import { SideNav } from './components/layout/SideNav';
import { PAGES } from './navigation';
import { TopBar } from './components/layout/TopBar';
import { usePatientDashboard } from './hooks/usePatientDashboard';
import { DashboardPage } from './pages/DashboardPage';
import { HistoryPage } from './pages/HistoryPage';

const PAGE_COMPONENTS = {
  monitoring: DashboardPage,
  history: HistoryPage,
};

export default function App() {
  const [patientId, setPatientId] = useState(null);
  const [currentPage, setCurrentPage] = useState('monitoring');

  // Um único polling compartilhado pelas páginas: trocar de aba não refaz a consulta.
  const query = usePatientDashboard(patientId);
  const Page = PAGE_COMPONENTS[currentPage];

  return (
    <div className="flex h-dvh overflow-hidden bg-background font-sans text-on-surface">
      <SideNav activePage={currentPage} onNavigate={setCurrentPage} />

      <div className="scrollbar-thin flex h-full w-full flex-1 flex-col overflow-y-auto md:ml-[280px]">
        <TopBar
          title={PAGES[currentPage].label}
          status={query.status}
          lastSuccessAt={query.lastSuccessAt}
          onRefetch={query.refetch}
          patientId={patientId}
          onPatientSearch={setPatientId}
        />
        <Page patientId={patientId} query={query} />
      </div>
    </div>
  );
}
