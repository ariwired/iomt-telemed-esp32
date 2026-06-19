import { formatTimestamp, riskMeta } from "../utils/formatters";

export default function RiskBanner({ riskLevel, riskScore, timestamp }) {
  const meta = riskMeta(riskLevel);
  const confidence = riskScore === null || riskScore === undefined ? null : Math.round(riskScore * 100);

  return (
    <section className={`risk-banner tone-${meta.tone}`} role="status" aria-live="polite">
      <div className="risk-banner__main">
        <p className="risk-banner__eyebrow">Risco preditivo · modelo de IA</p>
        <h2 className="risk-banner__level">{meta.label}</h2>
        <p className="risk-banner__meta">Atualizado às {formatTimestamp(timestamp)}</p>
      </div>

      <div className="risk-banner__confidence" aria-hidden="true">
        <span className="risk-banner__confidence-label">Confiança do modelo</span>
        <span className="risk-banner__confidence-value">
          {confidence !== null ? `${confidence}%` : "—"}
        </span>
      </div>
    </section>
  );
}