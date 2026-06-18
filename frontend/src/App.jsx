import { useEffect, useState } from "react";
import Header from "./components/Header";
import RiskBanner from "./components/RiskBanner";
import VitalCard from "./components/VitalCard";
import EcgTrace from "./components/EcgTrace";
import HistoryChart from "./components/HistoryChart";
import ReadingsTable from "./components/ReadingsTable";
import { usePatientDashboard } from "./hooks/usePatientDashboard";
import { classifyHeartRate, classifySpo2, classifyTemperature } from "./utils/formatters";

const STORAGE_KEY = "iomt-telemed:lastPatientId";
const DEFAULT_PATIENT_ID = import.meta.env.VITE_DEFAULT_PATIENT_ID || "12345";

export default function App() {
  const [patientId, setPatientId] = useState(
    () => localStorage.getItem(STORAGE_KEY) || DEFAULT_PATIENT_ID
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, patientId);
  }, [patientId]);

  const { data, error, status, lastSuccessAt, refetch } = usePatientDashboard(patientId);

  const current = data?.currentVitals ?? null;
  const series = data?.historicalSeries ?? [];
  const chronological = [...series].reverse();

  return (
    <div className="app-shell">
      <Header
        connectionStatus={status}
        lastSuccessAt={lastSuccessAt}
        patientId={patientId}
        patientName={data?.nome}
        onPatientSubmit={setPatientId}
      />

      <main className="app-content">
        {status === "offline" && error && (
          <div className="error-banner">
            <p>{error.message}</p>
            {error.status === 404 || error.status === 500 ? (
              <p className="error-banner__hint">
                A API exposta neste projeto não tem um endpoint para cadastrar pacientes — é preciso que já
                exista uma linha na tabela <code>patients</code> com este <code>paciente_id</code> antes de
                consultar o dashboard.
              </p>
            ) : null}
            <button type="button" onClick={refetch}>
              Tentar novamente
            </button>
          </div>
        )}

        {status === "idle" || (status === "loading" && !data) ? (
          <div className="loading-state">Conectando ao servidor…</div>
        ) : data && !current ? (
          <div className="empty-state">
            <h2>Aguardando telemetria</h2>
            <p>
              O paciente <strong>{data.nome}</strong> ainda não possui leituras registradas. Assim que o ESP32
              publicar a primeira mensagem MQTT, os dados aparecerão aqui automaticamente.
            </p>
          </div>
        ) : current ? (
          <>
            <RiskBanner
              riskLevel={current.riskLevel}
              riskScore={current.riskScore}
              timestamp={current.timestamp}
            />

            <section className="vitals-grid">
              <VitalCard
                icon="droplet"
                label="SpO2"
                sublabel="Saturação de oxigênio"
                value={current.spo2}
                unit="%"
                history={chronological.map((r) => r.spo2)}
                color="var(--accent-spo2)"
                status={classifySpo2(current.spo2)}
              />
              <VitalCard
                icon="heart"
                label="Frequência cardíaca"
                sublabel="MAX30102 (PPG)"
                value={current.frequenciaCardiaca}
                unit="bpm"
                history={chronological.map((r) => r.frequenciaCardiaca)}
                color="var(--accent-hr)"
                status={classifyHeartRate(current.frequenciaCardiaca)}
              />
              <VitalCard
                icon="thermometer"
                label="Temperatura"
                sublabel="DS18B20"
                value={current.temperatura}
                unit="°C"
                decimals={1}
                history={chronological.map((r) => r.temperatura)}
                color="var(--accent-temp)"
                status={classifyTemperature(current.temperatura)}
              />
            </section>

            <EcgTrace
              bpm={current.frequenciaCardiaca}
              hasSignal={Boolean(current.frequenciaCardiaca && current.frequenciaCardiaca > 0)}
            />

            <section className="lower-grid-clean">
              <HistoryChart series={series} />
            </section>

            <ReadingsTable series={series} />
          </>
        ) : null}
      </main>

      <footer className="app-footer">
        Sistema Híbrido de Monitoramento Remoto - Telemedicina IoMT com ESP32, MQTT e React
      </footer>
    </div>
  );
}