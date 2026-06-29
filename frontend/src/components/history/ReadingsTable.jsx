import React, { useMemo, useState, useEffect } from 'react';
import { VITALS_CONFIG, STATUS_META, RISK_LEVEL_META } from '../../constants/vitals';
import { formatDateTime } from '../../utils/formatters';

const PAGE_SIZE = 20;

// Colunas de sinais vitais — riskScore é tratado separadamente (pode ser "—")
const VITAL_COLS = VITALS_CONFIG.filter((c) => c.key !== 'riskScore');
const RISK_SCORE_CONFIG = VITALS_CONFIG.find((c) => c.key === 'riskScore');

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function VitalCell({ value, config }) {
  if (value == null) {
    return <span className="text-on-surface-variant">—</span>;
  }
  const status = config.getStatus(value);
  const meta   = STATUS_META[status];
  const showUnit = config.unit && !config.format(value).includes(config.unit);
  return (
    <span className={`font-medium tabular-nums ${meta.textClass}`}>
      {config.format(value)}
      {showUnit && (
        <span className="text-on-surface-variant font-normal ml-0.5 text-label-md">
          {config.unit}
        </span>
      )}
    </span>
  );
}

function RiskChip({ riskLevel }) {
  const meta = RISK_LEVEL_META[riskLevel];
  if (!meta) return <span className="text-on-surface-variant">—</span>;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-label-md font-semibold whitespace-nowrap ${meta.bgClass} ${meta.textClass}`}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          backgroundColor: meta.dot,
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      {meta.label}
    </span>
  );
}

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  // Janela de páginas ao redor da atual (sempre mostra primeira, última e vizinhas)
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, idx, arr) => {
      if (idx > 0 && p - arr[idx - 1] > 1) acc.push('ellipsis');
      acc.push(p);
      return acc;
    }, []);

  return (
    <div className="flex items-center justify-between">
      <button
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-body-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
        Anterior
      </button>

      <div className="flex items-center gap-1">
        {pages.map((item, idx) =>
          item === 'ellipsis' ? (
            <span key={`e-${idx}`} className="text-on-surface-variant text-body-md px-1">
              …
            </span>
          ) : (
            <button
              key={item}
              onClick={() => onChange(item)}
              className={[
                'w-8 h-8 rounded-lg text-body-md font-medium transition-colors',
                item === page
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high',
              ].join(' ')}
            >
              {item}
            </button>
          ),
        )}
      </div>

      <button
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-body-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        Próxima
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
      </button>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function ReadingsTable({ series }) {
  const [page, setPage] = useState(1);

  // Volta para a primeira página ao trocar de paciente
  useEffect(() => setPage(1), [series]);

  const sorted = useMemo(
    () => [...(series ?? [])].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    [series],
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const rows       = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (!sorted.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-on-surface-variant">
        <span className="material-symbols-outlined" style={{ fontSize: 32, opacity: 0.4 }}>
          table_rows
        </span>
        <p className="text-body-md">Nenhuma leitura disponível.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Contagem */}
      <p className="text-label-md text-on-surface-variant">
        {sorted.length} leitura{sorted.length !== 1 ? 's' : ''} no período
        {totalPages > 1 && ` · página ${page} de ${totalPages}`}
      </p>

      {/* Tabela com scroll horizontal em telas pequenas */}
      <div className="overflow-x-auto rounded-xl border border-surface-variant">
        <table className="w-full border-collapse text-body-md">
          <thead>
            <tr className="bg-surface-container-high border-b border-surface-variant">
              <th className="px-4 py-3 text-left text-label-md text-on-surface-variant uppercase tracking-widest font-medium whitespace-nowrap">
                Data / Hora
              </th>
              {VITAL_COLS.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-right text-label-md text-on-surface-variant uppercase tracking-widest font-medium whitespace-nowrap"
                >
                  {col.label}
                </th>
              ))}
              <th className="px-4 py-3 text-right text-label-md text-on-surface-variant uppercase tracking-widest font-medium whitespace-nowrap">
                Score
              </th>
              <th className="px-4 py-3 text-left text-label-md text-on-surface-variant uppercase tracking-widest font-medium whitespace-nowrap">
                Risco
              </th>
              <th className="px-4 py-3 text-left text-label-md text-on-surface-variant uppercase tracking-widest font-medium whitespace-nowrap">
                Fonte
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row, i) => {
              const isCritical = !row._riskScoreFilled && row.riskLevel === 'CRITICAL';
              const isHigh     = !row._riskScoreFilled && row.riskLevel === 'HIGH';

              const rowBg = isCritical
                ? 'bg-[#1a0a0a] hover:bg-[#230d0d]'
                : isHigh
                  ? 'bg-[#1a1100] hover:bg-[#231700]'
                  : i % 2 === 0
                    ? 'bg-surface-container hover:bg-surface-container-high'
                    : 'bg-surface-container-low hover:bg-surface-container-high';

              return (
                <tr
                  key={row.id ?? row.timestamp}
                  className={`border-b border-surface-variant transition-colors duration-100 ${rowBg}`}
                >
                  {/* Timestamp */}
                  <td className="px-4 py-3 whitespace-nowrap text-on-surface-variant tabular-nums text-body-md">
                    {formatDateTime(row.timestamp)}
                  </td>

                  {/* SpO₂, Freq. Cardíaca, Temperatura */}
                  {VITAL_COLS.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-right whitespace-nowrap">
                      <VitalCell value={row[col.key] ?? null} config={col} />
                    </td>
                  ))}

                  {/* Score de risco — "—" se calculado por forward-fill */}
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {row._riskScoreFilled ? (
                      <span className="text-on-surface-variant">—</span>
                    ) : (
                      <VitalCell value={row.riskScore ?? null} config={RISK_SCORE_CONFIG} />
                    )}
                  </td>

                  {/* Nível de risco — "—" se calculado por forward-fill */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {row._riskScoreFilled ? (
                      <span className="text-on-surface-variant">—</span>
                    ) : (
                      <RiskChip riskLevel={row.riskLevel} />
                    )}
                  </td>

                  {/* Fonte */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-label-md bg-surface-container-high px-2 py-0.5 rounded-full text-on-surface-variant uppercase tracking-wide">
                      {row.source ?? '—'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}