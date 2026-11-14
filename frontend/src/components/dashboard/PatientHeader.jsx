import { COLORS } from '../../theme';
import { RISK_LEVELS, STATUS_META, VITALS, formatVital } from '../../domain/vitals';
import { formatRelativeTime, formatTime } from '../../utils/formatters';
import { useNow } from '../../hooks/useNow';
import { Dot } from '../ui/Dot';
import { Icon } from '../ui/Icon';
import { RiskBadge } from '../ui/RiskBadge';
import { StatusDot } from '../ui/StatusDot';

function MiniStat({ icon, label, value, unit, status }) {
  const meta = STATUS_META[status];
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-on-surface-variant">
        <Icon name={icon} size={14} />
        <span className="text-label-md uppercase tracking-widest">{label}</span>
      </div>
      <div className="flex items-end gap-1 leading-none">
        <span className={`text-headline-md font-bold tabular-nums ${meta.textClass}`}>{value}</span>
        {unit && <span className="mb-0.5 text-body-md text-on-surface-variant">{unit}</span>}
      </div>
      <div className="flex items-center gap-1.5">
        <Dot color={meta.color} size={6} />
        <span className={`text-label-md ${meta.textClass}`}>{meta.label}</span>
      </div>
    </div>
  );
}

function Separator() {
  return <span className="text-outline">·</span>;
}

/**
 * @param {{
 *   dashboard: import('../../domain/normalize').PatientDashboard,
 *   status: import('../../hooks/usePatientDashboard').ConnectionStatus,
 *   lastSuccessAt: number | null,
 * }} props
 */
export function PatientHeader({ dashboard, status, lastSuccessAt }) {
  const now = useNow();
  const { nome, pacienteId, latest, latestRisk } = dashboard;
  const riskMeta = latestRisk ? RISK_LEVELS[latestRisk.level] : null;

  return (
    <section
      className="flex flex-col gap-5 rounded-xl border border-surface-variant bg-surface-container p-6"
      style={{ borderLeft: `3px solid ${riskMeta?.color ?? COLORS.outlineVariant}` }}
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-3">
            <h2 className="text-headline-lg text-on-surface">{nome ?? pacienteId}</h2>
            {status === 'online' && (
              <div className="flex items-center gap-1.5">
                <StatusDot status="online" size={7} />
                <span className="text-label-md uppercase tracking-widest text-on-surface-variant">Ao vivo</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-md text-on-surface-variant">
            <span>
              ID: <span className="font-medium text-on-surface">{pacienteId}</span>
            </span>
            {latest && (
              <>
                <Separator />
                <span>
                  Última leitura:{' '}
                  <span className="font-medium tabular-nums text-on-surface">{formatTime(latest.t)}</span>
                </span>
              </>
            )}
            {lastSuccessAt && (
              <>
                <Separator />
                <span>Sincronizado {formatRelativeTime(lastSuccessAt, now)}</span>
              </>
            )}
            {latest?.source && (
              <>
                <Separator />
                <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-label-md uppercase tracking-wide">
                  {latest.source}
                </span>
              </>
            )}
          </div>
        </div>

        {latestRisk && <RiskBadge riskLevel={latestRisk.level} size="lg" />}
      </div>

      <div className="border-t border-surface-variant" />

      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {VITALS.map((vital) => {
          const value = latest?.[vital.key] ?? null;
          return (
            <MiniStat
              key={vital.key}
              icon={vital.icon}
              label={vital.label}
              value={formatVital(vital, value)}
              unit={value != null ? vital.unit : ''}
              status={vital.getStatus(value)}
            />
          );
        })}
        <MiniStat
          icon="crisis_alert"
          label="Risco (IA)"
          value={riskMeta?.label ?? '—'}
          status={riskMeta?.status ?? 'unknown'}
        />
      </div>
    </section>
  );
}
