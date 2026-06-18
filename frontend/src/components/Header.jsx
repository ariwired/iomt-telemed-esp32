import PatientSelector from "./PatientSelector";
import { formatTimestamp } from "../utils/formatters";

const STATUS_COPY = {
  idle: { label: "Conectando…", tone: "idle" },
  loading: { label: "Conectando…", tone: "idle" },
  online: { label: "Em tempo real", tone: "online" },
  offline: { label: "Sem conexão com a API", tone: "offline" }
};

export default function Header({ connectionStatus, lastSuccessAt, patientId, patientName, onPatientSubmit }) {
  const statusCopy = STATUS_COPY[connectionStatus] ?? STATUS_COPY.idle;

  return (
    <header className="app-header">
      <div className="app-header__brand">
        <span className="app-header__mark" aria-hidden="true" />
        <div>
          <p className="app-header__title">IoMT TeleMed</p>
          <p className="app-header__subtitle">Monitor remoto pós-operatório</p>
        </div>
      </div>

      <div className="app-header__patient">
        <p className="app-header__patient-name">{patientName ?? "—"}</p>
        <p className="app-header__patient-id">paciente #{patientId}</p>
      </div>

      <div className="app-header__status">
        <span className={`status-dot tone-${statusCopy.tone}`} aria-hidden="true" />
        <div>
          <p className="app-header__status-label">{statusCopy.label}</p>
          {lastSuccessAt && (
            <p className="app-header__status-time">última leitura às {formatTimestamp(lastSuccessAt)}</p>
          )}
        </div>
      </div>

      <PatientSelector patientId={patientId} onSubmit={onPatientSubmit} />
    </header>
  );
}
