import React from 'react';

function Bone({ className = '', style }) {
  return (
    <div
      className={`bg-surface-container-high rounded-lg animate-pulse ${className}`}
      style={style}
    />
  );
}

export function VitalCardSkeleton() {
  return (
    <div className="bg-surface-container rounded-xl p-6 flex flex-col gap-5 border border-transparent">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Bone className="w-10 h-10 rounded-lg flex-shrink-0" />
          <div className="flex flex-col gap-2">
            <Bone className="w-24 h-3 rounded" />
            <Bone className="w-16 h-7 rounded" />
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Bone className="w-20 h-4 rounded-full" />
          <Bone className="w-14 h-4 rounded" />
        </div>
      </div>

      {/* Chart */}
      <Bone className="w-full rounded-lg" style={{ height: 160 }} />

      {/* Stats footer */}
      <div className="flex items-center justify-between pt-3 border-t border-surface-variant">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Bone className="w-8 h-3 rounded" />
            <Bone className="w-14 h-4 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PatientHeaderSkeleton() {
  return (
    <div className="bg-surface-container rounded-xl p-6 flex flex-col gap-5 border border-surface-variant animate-pulse">
      {/* Identity row */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Bone className="w-56 h-7 rounded" />
          <Bone className="w-80 h-4 rounded" />
        </div>
        <Bone className="w-36 h-10 rounded-full" />
      </div>

      {/* Divider */}
      <div className="border-t border-surface-variant" />

      {/* Vitals mini-grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <Bone className="w-24 h-3 rounded" />
            <Bone className="w-16 h-6 rounded" />
            <Bone className="w-12 h-3 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}