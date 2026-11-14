import { COLORS } from '../../theme';
import { formatShortTime } from '../../utils/formatters';

export const AXIS_TICK = { fontSize: 10, fill: COLORS.outline };

export const GRID_PROPS = {
  stroke: COLORS.outlineVariant,
  strokeDasharray: '4 4',
  strokeOpacity: 0.45,
  vertical: false,
};

/** Eixo X em tempo real: o espaçamento reflete o intervalo entre leituras. */
export const TIME_AXIS_PROPS = {
  dataKey: 't',
  type: 'number',
  scale: 'time',
  tickFormatter: formatShortTime,
  tick: AXIS_TICK,
  tickLine: false,
  axisLine: false,
  minTickGap: 48,
};

export const CHART_MARGIN = { top: 8, right: 12, bottom: 0, left: 0 };
