import { Icon } from '../ui/Icon';

export function ErrorState({ error, onRetry }) {
  const notFound = error?.status === 404;
  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-5 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-error-container text-on-error-container">
        <Icon name={notFound ? 'person_off' : 'cloud_off'} size={30} />
      </div>
      <div>
        <h3 className="mb-2 text-headline-md text-on-surface">
          {notFound ? 'Paciente não encontrado' : 'Falha na conexão'}
        </h3>
        <p className="max-w-md text-body-md text-on-surface-variant">
          {error?.message ?? 'Não foi possível obter os dados do paciente.'}
        </p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-2 rounded-xl bg-surface-container-high px-5 py-2.5 text-body-md font-medium text-on-surface transition-colors hover:bg-surface-container-highest active:scale-95"
        >
          <Icon name="refresh" size={18} />
          Tentar novamente
        </button>
      )}
    </div>
  );
}

/** Aviso discreto quando a conexão cai mas ainda há dados anteriores na tela. */
export function StaleDataBanner({ error, lastSuccessAt, onRetry }) {
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-error-container bg-error-container/30 px-4 py-3 text-body-md text-on-error-container"
    >
      <span className="flex items-center gap-2">
        <Icon name="cloud_off" size={18} />
        {error?.message ?? 'Sem conexão com a API.'}
        {lastSuccessAt && ' Os dados abaixo podem estar desatualizados.'}
      </span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="font-medium underline-offset-2 hover:underline">
          Tentar agora
        </button>
      )}
    </div>
  );
}
