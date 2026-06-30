import React from 'react';
import { RiskBadge }            from '../ui/RiskBadge';
import { PatientHeaderSkeleton } from '../ui/Skeleton';
import { StatusDot }             from '../ui/StatusDot';
import { formatTimestamp, formatRelativeTime } from '../../utils/formatters';
import { VITALS_CONFIG, STATUS_META, RISK_LEVEL_META } from '../../constants/vitals';

// ─── Mini-stat de vital (dentro do card de resumo) ───────────────────────────

function VitalMiniStat({ config, value }) {
  const status = config.getStatus(value);
  const meta   = STATUS_META[status];

  // Evita repetir unidade se a função format já a inclui (ex: riskScore)
  const showUnit = config.unit && !config.format(value).includes(config.unit);

  return (
    <div className="flex flex-col gap-1.5">
      {/* Label + ícone */}
      <div className="flex items-center gap-1.5">
        <span
          className="material-symbols-outlined text-on-surface-variant"
          style={{ fontSize: 14 }}
        >
          {config.icon}
        </span>
        <span className="text-label-md text-on-surface-variant uppercase tracking-widest">
          {config.label}
        </span>
      </div>

      {/* Valor atual */}
      <div className="flex items-end gap-1 leading-none">
        <span className={`text-headline-md font-bold ${meta.textClass}`}>
          {config.format(value)}
        </span>
        {showUnit && (
          <span className="text-body-md text-on-surface-variant mb-0.5">
            {config.unit}
          </span>
        )}
      </div>

      {/* Status clínico */}
      <div className="flex items-center gap-1.5">
        <span
          style={{
            display: 'inline-block',
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: meta.color,
            flexShrink: 0,
          }}
        />
        <span className={`text-label-md ${meta.textClass}`}>{meta.label}</span>
      </div>
    </div>
  );
}

// ─── Card principal ───────────────────────────────────────────────────────────

export function PatientHeader({ patient, status, lastSuccessAt }) {
  if (!patient) return <PatientHeaderSkeleton />;

  const { nome, pacienteId, currentVitals } = patient;
  const riskLevel   = currentVitals?.riskLevel;

  // Borda esquerda colorida pelo nível de risco para identificação imediata
  const borderColor = RISK_LEVEL_META[riskLevel]?.dot ?? '#3e4a40';

  return (
    <div
      className="bg-surface-container rounded-xl p-6 flex flex-col gap-5 border border-surface-variant"
      style={{ borderLeft: `3px solid ${borderColor}` }}
    >
      {/* Linha de identidade */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h2 className="text-headline-lg text-on-surface">
              {nome ?? pacienteId}
            </h2>

            {status === 'online' && (
              <div className="flex items-center gap-1.5">
                <StatusDot status="online" size={7} />
                <span className="text-label-md text-on-surface-variant uppercase tracking-widest">
                  Ao vivo
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-md text-on-surface-variant">
            <span>
              ID:{' '}
              <span className="text-on-surface font-medium">{pacienteId}</span>
            </span>

            {currentVitals?.timestamp && (
              <>
                <span className="text-outline">·</span>
                <span>
                  Última leitura:{' '}
                  <span className="text-on-surface font-medium">
                    {formatTimestamp(currentVitals.timestamp)}
                  </span>
                </span>
              </>
            )}

            {lastSuccessAt && (
              <>
                <span className="text-outline">·</span>
                <span>Sincronizado {formatRelativeTime(lastSuccessAt)}</span>
              </>
            )}

            {currentVitals?.source && (
              <>
                <span className="text-outline">·</span>
                <span className="text-label-md bg-surface-container-high px-2 py-0.5 rounded-full uppercase tracking-wide">
                  {currentVitals.source}
                </span>
              </>
            )}
          </div>
        </div>

        {riskLevel && <RiskBadge riskLevel={riskLevel} large />}
      </div>

      {/* Divisor */}
      <div className="border-t border-surface-variant" />

      {/* Grid com os 4 vitais atuais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {VITALS_CONFIG.map((config) => (
          <VitalMiniStat
            key={config.key}
            config={config}
            value={currentVitals?.[config.key] ?? null}
          />
        ))}
      </div>
    </div>
  );
}