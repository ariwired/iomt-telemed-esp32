import React, { useState } from 'react';
import { SideNav }  from './components/layout/SideNav';
import { TopBar }   from './components/layout/TopBar';
import { DashboardPage } from './pages/DashboardPage';
import { HistoryPage }   from './pages/HistoryPage';
import { usePatientDashboard } from './hooks/usePatientDashboard';

export default function App() {
  const [patientId,   setPatientId]   = useState(null);
  const [currentPage, setCurrentPage] = useState('monitoring');

  const { data, error, status, lastSuccessAt, refetch } = usePatientDashboard(patientId);

  const pageProps = { patientId, data, error, status, lastSuccessAt, refetch };

  return (
    <div className="flex bg-background text-on-surface h-screen overflow-hidden font-sans">
      <SideNav activePage={currentPage} onNavigate={setCurrentPage} />

      <div className="flex flex-col flex-1 md:ml-[280px] w-full h-full overflow-y-auto scrollbar-thin">
        <TopBar
          status={status}
          lastSuccessAt={lastSuccessAt}
          onRefetch={refetch}
          patientId={patientId}
          onPatientSearch={setPatientId}
        />

        {currentPage === 'monitoring' && <DashboardPage {...pageProps} />}
        {currentPage === 'history'    && <HistoryPage   {...pageProps} />}
      </div>
    </div>
  );
}