import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { normalizeDashboard } from '../domain/normalize';
import { MetricsGrid } from './dashboard/MetricsGrid';
import { PatientHeader } from './dashboard/PatientHeader';
import { ReadingsTable } from './history/ReadingsTable';

function makeRaw() {
  const start = Date.UTC(2026, 10, 14, 12, 0, 0);
  const series = Array.from({ length: 25 }, (_, i) => ({
    id: i + 1,
    pacienteId: '1234',
    spo2: i === 7 ? 0 : 96 + (i % 3),
    frequenciaCardiaca: i === 7 ? 0 : 70 + (i % 5),
    temperatura: 36.5 + (i % 4) / 10,
    riskScore: i % 6 === 0 ? 0.8 : null,
    riskLevel: i % 6 === 0 ? ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'][i % 4] : null,
    source: 'MQTT_FOG',
    // Interrupção de 2 minutos entre as leituras 14 e 15
    timestamp: new Date(start + i * 5000 + (i > 14 ? 120_000 : 0)).toISOString(),
  })).reverse();
  return { pacienteId: '1234', nome: 'Paciente 1234', currentVitals: series[0], historicalSeries: series };
}

describe('renderização', () => {
  const dashboard = normalizeDashboard(makeRaw());

  it('cabeçalho mostra o risco mais recente', () => {
    const html = renderToString(<PatientHeader dashboard={dashboard} status="online" lastSuccessAt={Date.now()} />);
    expect(html).toContain('Paciente 1234');
    expect(html).toContain('Risco');
  });

  it('grade de métricas renderiza os quatro cards', () => {
    const html = renderToString(<MetricsGrid dashboard={dashboard} />);
    expect(html.match(/<article/g)).toHaveLength(4);
  });

  it('tabela pagina e marca leitura sem sensor como ausente', () => {
    const html = renderToString(<ReadingsTable readings={dashboard.readings} />);
    expect(html).toContain('página 1 de 2');
    expect(html).toContain('Sem leitura válida do sensor');
  });

  it('suporta paciente sem leituras', () => {
    const empty = normalizeDashboard({ pacienteId: '9', nome: null, historicalSeries: [] });
    expect(() => renderToString(<MetricsGrid dashboard={empty} />)).not.toThrow();
    expect(() => renderToString(<PatientHeader dashboard={empty} status="online" lastSuccessAt={null} />)).not.toThrow();
  });
});
