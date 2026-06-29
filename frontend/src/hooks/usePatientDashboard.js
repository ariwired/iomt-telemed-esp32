import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchPatientDashboard } from '../api/dashboardApi';
import { fillForwardRiskFields } from '../utils/transforms';

const DEFAULT_INTERVAL_MS = Number(import.meta.env.VITE_POLL_INTERVAL_MS) || 4000;

export function usePatientDashboard(patientId, intervalMs = DEFAULT_INTERVAL_MS) {
  const [data, setData]               = useState(null);
  const [error, setError]             = useState(null);
  const [status, setStatus]           = useState('idle');
  const [lastSuccessAt, setLastSuccessAt] = useState(null);

  const abortRef = useRef(null);
  const timerRef = useRef(null);

  const load = useCallback(
    async ({ silent } = {}) => {
      if (!patientId) return;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      if (!silent) setStatus('loading');
      try {
        const raw    = await fetchPatientDashboard(patientId, { signal: controller.signal });
        const result = fillForwardRiskFields(raw);
        setData(result);
        setError(null);
        setStatus('online');
        setLastSuccessAt(new Date());
      } catch (err) {
        if (err.name === 'AbortError') return;
        setError(err);
        setStatus('offline');
      }
    },
    [patientId],
  );

  useEffect(() => {
    setData(null);
    setError(null);
    setStatus('idle');
    setLastSuccessAt(null);
    if (!patientId) return;
    load();
    timerRef.current = setInterval(() => load({ silent: true }), intervalMs);
    return () => {
      clearInterval(timerRef.current);
      abortRef.current?.abort();
    };
  }, [patientId, intervalMs, load]);

  const refetch = useCallback(() => load(), [load]);

  return { data, error, status, lastSuccessAt, refetch };
}