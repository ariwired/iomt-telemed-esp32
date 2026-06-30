import React from 'react';

export function ErrorState({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-5 text-center">
      <div className="w-16 h-16 rounded-full bg-error-container flex items-center justify-center">
        <span className="material-symbols-outlined text-on-error-container" style={{ fontSize: 30 }}>
          cloud_off
        </span>
      </div>
      <div>
        <h3 className="text-headline-md text-on-surface mb-2">Falha na conexão</h3>
        <p className="text-body-md text-on-surface-variant max-w-md">
          {error?.message ?? 'Não foi possível obter os dados do paciente.'}
        </p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="
            flex items-center gap-2 px-5 py-2.5 rounded-xl
            bg-surface-container-high hover:bg-surface-container-highest
            text-on-surface text-body-md font-medium
            transition-colors active:scale-95
          "
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span>
          Tentar novamente
        </button>
      )}
    </div>
  );
}