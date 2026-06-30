import React from "react";

import { formatRelativeTime } from "../../utils/formatters";
import { StatusDot } from "../ui/StatusDot";
import { PatientSearchForm } from "../dashboard/PatientSearchForm";

const STATUS_LABELS = {
  idle: "Aguardando",
  loading: "Sincronizando",
  online: "Online",
  offline: "Offline",
};

export function TopBar({
  status,
  lastSuccessAt,
  onRefetch,
  patientId,
  onPatientSearch,
}) {
  return (
    <header className="flex justify-between items-center w-full px-6 md:px-10 py-4 bg-surface sticky top-0 z-10 border-b border-surface-variant">

      {/* Título */}

      <div className="flex items-center gap-5">

        <span className="text-headline-md font-bold text-on-surface tracking-tight">
          Monitoramento
        </span>

        <div className="hidden lg:block">
          <PatientSearchForm
            currentId={patientId}
            onSearch={onPatientSearch}
            status={status}
          />
        </div>

      </div>

      {/* Área direita */}

      <div className="flex items-center gap-4">

        {/* Status */}

        <div className="flex items-center gap-2 bg-surface-container-high px-3 py-1.5 rounded-full">

          <StatusDot status={status} />

          <span className="text-label-md text-on-surface uppercase tracking-widest">
            {STATUS_LABELS[status] ?? status}
          </span>

          {lastSuccessAt && (
            <span className="hidden sm:inline text-label-md text-on-surface-variant">
              · {formatRelativeTime(lastSuccessAt)}
            </span>
          )}

        </div>

        {/* Botões */}

        <div className="flex gap-1">

          <button
            onClick={onRefetch}
            title="Atualizar"
            className="
              p-2
              rounded-lg
              text-on-surface-variant
              hover:text-primary
              hover:bg-surface-container-high
              transition-colors
            "
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 22 }}
            >
              refresh
            </span>
          </button>

          <button
            title="Notificações"
            className="
              p-2
              rounded-lg
              text-on-surface-variant
              hover:text-primary
              hover:bg-surface-container-high
              transition-colors
            "
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 22 }}
            >
              notifications
            </span>
          </button>

        </div>

      </div>

    </header>
  );
}