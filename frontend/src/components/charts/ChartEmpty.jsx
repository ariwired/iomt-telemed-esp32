import { Icon } from '../ui/Icon';

export function ChartEmpty({ height, message = 'Sem dados históricos' }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 rounded-lg bg-surface-container-high text-label-md text-on-surface-variant"
      style={{ height }}
    >
      <Icon name="show_chart" size={24} className="opacity-50" />
      <span>{message}</span>
    </div>
  );
}
