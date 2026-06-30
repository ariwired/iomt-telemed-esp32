import React from 'react';

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
      <div className="w-20 h-20 rounded-full bg-surface-container-high flex items-center justify-center">
        <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 36 }}>
          monitor_heart
        </span>
      </div>
      <div>
        <h3 className="text-headline-md text-on-surface mb-2">Nenhum paciente selecionado</h3>
        <p className="text-body-md text-on-surface-variant max-w-sm">
          Insira o ID de um paciente para visualizar os sinais vitais e o monitoramento em tempo real.
        </p>
      </div>
    </div>
  );
}