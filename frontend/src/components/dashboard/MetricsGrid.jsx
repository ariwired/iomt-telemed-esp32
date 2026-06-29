import { VITALS_CONFIG } from '../../constants/vitals';
import { VitalCard } from './VitalCard';
import { VitalCardSkeleton } from '../ui/Skeleton';

export function MetricsGrid({ currentVitals, historicalSeries, loading = false }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {VITALS_CONFIG.map((config) =>
        loading ? (
          <VitalCardSkeleton key={config.key} />
        ) : (
          <VitalCard
            key={config.key}
            config={config}
            currentValue={currentVitals?.[config.key] ?? null}
            series={historicalSeries ?? []}
          />
        ),
      )}
    </div>
  );
}