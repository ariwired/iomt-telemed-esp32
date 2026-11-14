import { useMemo, useState } from 'react';
import { RISK_SOURCES, STATUS_META, VITALS, formatVital } from '../../domain/vitals';
import { formatDateTime, formatPercent } from '../../utils/formatters';
import { Icon } from '../ui/Icon';
import { RiskBadge } from '../ui/RiskBadge';
import { Pagination } from './Pagination';

const PAGE_SIZE = 20;

const TH = 'whitespace-nowrap px-4 py-3 text-label-md font-medium uppercase tracking-widest text-on-surface-variant';

const ROW_BG = {
  CRITICAL: 'bg-error-container/20 hover:bg-error-container/30',
  HIGH: 'bg-risk-high-container/50 hover:bg-risk-high-container/70',
};

function Missing({ title }) {
  return (
    <span className="text-on-surface-variant" title={title}>
      —
    </span>
  );
}

function VitalCell({ vital, value }) {
  if (value == null) return <Missing title="Sem leitura válida do sensor" />;
  const meta = STATUS_META[vital.getStatus(value)];
  return (
    <span className={`font-medium tabular-nums ${meta.textClass}`}>
      {formatVital(vital, value)}
      <span className="ml-0.5 text-label-md font-normal text-on-surface-variant">{vital.unit}</span>
    </span>
  );
}

/** @param {{ readings: import('../../domain/normalize').Reading[] }} props */
export function ReadingsTable({ readings }) {
  const [requestedPage, setPage] = useState(1);

  const sorted = useMemo(() => [...readings].reverse(), [readings]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  // Se a lista encolher, não deixa a página atual apontar para o vazio.
  const page = Math.min(requestedPage, totalPages);
  const rows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (!sorted.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-on-surface-variant">
        <Icon name="table_rows" size={32} className="opacity-40" />
        <p className="text-body-md">Nenhuma leitura disponível.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-label-md text-on-surface-variant">
        {sorted.length} leitura{sorted.length !== 1 ? 's' : ''} carregada{sorted.length !== 1 ? 's' : ''}
        {totalPages > 1 && ` · página ${page} de ${totalPages}`}
      </p>

      <div className="overflow-x-auto rounded-xl border border-surface-variant">
        <table className="w-full border-collapse text-body-md">
          <thead>
            <tr className="border-b border-surface-variant bg-surface-container-high">
              <th scope="col" className={`${TH} text-left`}>
                Data / Hora
              </th>
              {VITALS.map((vital) => (
                <th scope="col" key={vital.key} className={`${TH} text-right`}>
                  {vital.label}
                </th>
              ))}
              <th scope="col" className={`${TH} text-left`}>
                Risco (IA)
              </th>
              <th scope="col" className={`${TH} text-right`} title="Gravidade do risco: 0% = baixo, 100% = crítico">
                Gravidade
              </th>
              <th scope="col" className={`${TH} text-right`} title="Confiança do modelo no nível previsto">
                Confiança
              </th>
              <th scope="col" className={`${TH} text-left`}>
                Avaliado por
              </th>
              <th scope="col" className={`${TH} text-left`}>
                Fonte
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.id}
                className={`border-b border-surface-variant transition-colors duration-100 ${
                  ROW_BG[row.riskLevel] ??
                  (i % 2 === 0
                    ? 'bg-surface-container hover:bg-surface-container-high'
                    : 'bg-surface-container-low hover:bg-surface-container-high')
                }`}
              >
                <td className="whitespace-nowrap px-4 py-3 tabular-nums text-on-surface-variant">
                  {formatDateTime(row.t)}
                </td>
                {VITALS.map((vital) => (
                  <td key={vital.key} className="whitespace-nowrap px-4 py-3 text-right">
                    <VitalCell vital={vital} value={row[vital.key]} />
                  </td>
                ))}
                <td className="whitespace-nowrap px-4 py-3">
                  {row.riskLevel ? (
                    <RiskBadge riskLevel={row.riskLevel} size="sm" />
                  ) : (
                    <Missing title="Leitura não avaliada pelo modelo" />
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-on-surface-variant">
                  {row.riskScore != null ? formatPercent(row.riskScore) : <Missing />}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-on-surface-variant">
                  {row.riskConfidence != null ? formatPercent(row.riskConfidence) : <Missing />}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-label-md text-on-surface-variant">
                  {RISK_SOURCES[row.riskSource]?.short ?? <Missing />}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-label-md uppercase tracking-wide text-on-surface-variant">
                    {row.source ?? '—'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
