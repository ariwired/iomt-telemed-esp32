import { formatTimestamp, riskMeta } from "../utils/formatters";

export default function ReadingsTable({ series }) {
  if (!series || series.length === 0) {
    return (
      <section className="readings-table">
        <h3>Leituras recentes</h3>
        <p className="readings-table__empty">Nenhuma leitura registrada para este paciente ainda.</p>
      </section>
    );
  }

  return (
    <section className="readings-table">
      <h3>Leituras recentes</h3>
      <div className="readings-table__scroll">
        <table>
          <thead>
            <tr>
              <th>Horário</th>
              <th>SpO2</th>
              <th>FC</th>
              <th>Temp.</th>
              <th>Risco</th>
              <th>Origem</th>
            </tr>
          </thead>
          <tbody>
            {series.map((reading) => {
              const meta = riskMeta(reading.riskLevel);
              return (
                <tr key={reading.id}>
                  <td>{formatTimestamp(reading.timestamp)}</td>
                  <td>{reading.spo2 ?? "—"}{reading.spo2 !== null && reading.spo2 !== undefined ? "%" : ""}</td>
                  <td>{reading.frequenciaCardiaca ?? "—"}</td>
                  <td>{reading.temperatura !== null && reading.temperatura !== undefined ? `${reading.temperatura.toFixed(1)}°C` : "—"}</td>
                  <td>
                    <span className={`status-pill tone-${meta.tone}`}>{meta.label}</span>
                  </td>
                  <td className="readings-table__source">{reading.source ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
