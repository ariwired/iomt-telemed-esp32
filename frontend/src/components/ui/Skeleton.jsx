function Bone({ className = '', style }) {
  return <div className={`animate-pulse rounded-lg bg-surface-container-high ${className}`} style={style} />;
}

export function VitalCardSkeleton() {
  return (
    <div className="flex flex-col gap-5 rounded-xl border border-transparent bg-surface-container p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Bone className="h-10 w-10 shrink-0" />
          <div className="flex flex-col gap-2">
            <Bone className="h-3 w-24 rounded" />
            <Bone className="h-7 w-16 rounded" />
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Bone className="h-4 w-20 rounded-full" />
          <Bone className="h-4 w-14 rounded" />
        </div>
      </div>
      <Bone className="w-full" style={{ height: 160 }} />
      <div className="flex items-center justify-between border-t border-surface-variant pt-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Bone className="h-3 w-8 rounded" />
            <Bone className="h-4 w-14 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PatientHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-5 rounded-xl border border-surface-variant bg-surface-container p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex flex-col gap-2">
          <Bone className="h-7 w-56 rounded" />
          <Bone className="h-4 w-80 max-w-full rounded" />
        </div>
        <Bone className="h-10 w-36 rounded-full" />
      </div>
      <div className="border-t border-surface-variant" />
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <Bone className="h-3 w-24 rounded" />
            <Bone className="h-6 w-16 rounded" />
            <Bone className="h-3 w-12 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 10 }) {
  return (
    <div className="overflow-hidden rounded-xl border border-surface-variant">
      <Bone className="w-full rounded-none" style={{ height: 44 }} />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="border-t border-surface-variant">
          <Bone className="w-full rounded-none" style={{ height: 48, opacity: Math.max(0.15, 1 - i * 0.08) }} />
        </div>
      ))}
    </div>
  );
}
