import { useCallback, useEffect, useReducer, useRef } from 'react';
import { fetchPatientDashboard } from '../api/dashboardApi';
import { HISTORY_LIMIT, POLL_INTERVAL_MS } from '../config';
import { normalizeDashboard } from '../domain/normalize';

/**
 * @typedef {'idle' | 'loading' | 'online' | 'offline'} ConnectionStatus
 */

const initialState = {
  /** @type {import('../domain/normalize').PatientDashboard | null} */
  data: null,
  /** @type {Error | null} */
  error: null,
  /** @type {ConnectionStatus} */
  status: 'idle',
  /** @type {number | null} */
  lastSuccessAt: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'reset':
      return initialState;
    case 'loading':
      return { ...state, status: 'loading' };
    case 'success':
      return {
        // Mantém a mesma referência quando nada mudou: evita re-renderizar e
        // recalcular todos os gráficos a cada consulta sem leitura nova.
        data: state.data?.signature === action.data?.signature ? state.data : action.data,
        error: null,
        status: 'online',
        lastSuccessAt: action.at,
      };
    case 'failure':
      return { ...state, error: action.error, status: 'offline' };
    default:
      return state;
  }
}

/**
 * Consulta periodicamente o dashboard de um paciente.
 *
 * - A próxima consulta só é agendada quando a anterior termina, então uma API
 *   lenta não gera requisições sobrepostas nem cancela a si mesma em loop.
 * - Respostas atrasadas de um paciente anterior são descartadas.
 * - Com a aba em segundo plano o polling pausa e volta ao reabrir.
 */
export function usePatientDashboard(patientId, { intervalMs = POLL_INTERVAL_MS, limit = HISTORY_LIMIT } = {}) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const refetchRef = useRef(() => {});

  useEffect(() => {
    dispatch({ type: 'reset' });
    if (!patientId) return undefined;

    let disposed = false;
    let timer = null;
    let controller = null;

    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (document.hidden) return; // retomado pelo visibilitychange
        run();
      }, intervalMs);
    };

    async function run({ showLoading = false } = {}) {
      clearTimeout(timer);
      controller?.abort();
      const current = new AbortController();
      controller = current;

      if (showLoading) dispatch({ type: 'loading' });

      try {
        const raw = await fetchPatientDashboard(patientId, { signal: current.signal, limit });
        if (disposed || current.signal.aborted) return;
        dispatch({ type: 'success', data: normalizeDashboard(raw), at: Date.now() });
      } catch (error) {
        if (disposed || current.signal.aborted) return;
        dispatch({ type: 'failure', error });
      } finally {
        if (!disposed && controller === current) schedule();
      }
    }

    const onVisibilityChange = () => {
      if (!document.hidden) run();
    };

    refetchRef.current = () => run({ showLoading: true });
    document.addEventListener('visibilitychange', onVisibilityChange);
    run({ showLoading: true });

    return () => {
      disposed = true;
      clearTimeout(timer);
      controller?.abort();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      refetchRef.current = () => {};
    };
  }, [patientId, intervalMs, limit]);

  const refetch = useCallback(() => refetchRef.current(), []);

  return { ...state, refetch };
}
