import Sparkline from "./Sparkline";

const ICONS = {
  droplet: (
    <path d="M12 2.5C12 2.5 5 10.5 5 15a7 7 0 0 0 14 0c0-4.5-7-12.5-7-12.5Z" />
  ),
  heart: (
    <path d="M12 20.5s-7.5-4.6-10-9.3C0.5 7.8 2.4 4.5 6 4.5c2 0 3.5 1.2 4.2 2.4l1.8 3 1.8-3c.7-1.2 2.2-2.4 4.2-2.4 3.6 0 5.5 3.3 4 6.7-2.5 4.7-10 9.3-10 9.3Z" />
  ),
  thermometer: (
    <path d="M14 14.76V4a2 2 0 0 0-4 0v10.76a4 4 0 1 0 4 0ZM12 7v6" />
  )
};

export default function VitalCard({ icon, label, sublabel, value, unit, decimals = 0, history, color, status }) {
  const displayValue = value === null || value === undefined ? "--" : value.toFixed(decimals);

  return (
    <article className={`vital-card tone-${status.tone}`} style={{ "--card-accent": color }}>
      <header className="vital-card__head">
        <svg className="vital-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          {ICONS[icon]}
        </svg>
        <div>
          <p className="vital-card__label">{label}</p>
          <p className="vital-card__sublabel">{sublabel}</p>
        </div>
        <span className={`status-pill tone-${status.tone}`}>{status.label}</span>
      </header>

      <div className="vital-card__reading">
        <span className="vital-card__value">{displayValue}</span>
        <span className="vital-card__unit">{unit}</span>
      </div>

      <Sparkline values={history} color={color} />
    </article>
  );
}
