import { VITALS } from '../../domain/vitals';
import { VitalCardSkeleton } from '../ui/Skeleton';
import { RiskCard } from './RiskCard';
import { VitalCard } from './VitalCard';

const GRID_CLASS = 'grid grid-cols-1 gap-6 md:grid-cols-2';

export function MetricsGridSkeleton() {
  return (
    <div className={GRID_CLASS}>
      {[...VITALS, { key: 'risk' }].map((v) => (
        <VitalCardSkeleton key={v.key} />
      ))}
    </div>
  );
}

/** @param {{ dashboard: import('../../domain/normalize').PatientDashboard }} props */
export function MetricsGrid({ dashboard }) {
  const { readings, latest, latestRisk } = dashboard;
  return (
    <div className={GRID_CLASS}>
      {VITALS.map((vital) => (
        <VitalCard key={vital.key} vital={vital} readings={readings} currentValue={latest?.[vital.key] ?? null} />
      ))}
      <RiskCard readings={readings} latestRisk={latestRisk} />
    </div>
  );
}
