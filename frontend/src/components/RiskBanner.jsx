import { formatTimestamp, riskMeta } from "../utils/formatters";

export default function RiskBanner({ riskLevel, riskScore, timestamp }) {
  const meta = riskMeta(riskLevel);
  const percent = riskScore === null || riskScore === undefined ? 0 : Math.round(riskScore * 100);

  return (
    <section className={`risk-banner tone-${meta.tone}`} role="status" aria-live="polite">
      <div className="risk-banner__main">
        <p className="risk-banner__eyebrow">Risco preditivo · modelo de IA</p>
        <h2 className="risk-banner__level">{meta.label}</h2>
        <p className="risk-banner__meta">
          Atualizado às {formatTimestamp(timestamp)}
          {riskScore !== null && riskScore !== undefined ? ` · score ${riskScore.toFixed(2)}` : ""}
        </p>
      </div>

      <div className="risk-banner__gauge" aria-hidden="true">
        <div className="risk-banner__gauge-track">
          <div className="risk-banner__gauge-fill" style={{ width: `${percent}%` }} />
        </div>
        <span className="risk-banner__gauge-label">{percent}%</span>
      </div>
    </section>
  );
}