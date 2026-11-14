import { Icon } from '../ui/Icon';

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-24 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant">
        <Icon name="monitor_heart" size={36} />
      </div>
      <div>
        <h3 className="mb-2 text-headline-md text-on-surface">Nenhum paciente selecionado</h3>
        <p className="max-w-sm text-body-md text-on-surface-variant">
          Insira o ID de um paciente para visualizar os sinais vitais e o monitoramento em tempo real.
        </p>
      </div>
    </div>
  );
}
