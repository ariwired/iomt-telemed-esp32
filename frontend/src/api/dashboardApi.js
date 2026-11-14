import { API_BASE_URL } from '../config';

export class ApiError extends Error {
  /**
   * @param {string} message
   * @param {number} status  0 quando a API não respondeu.
   * @param {unknown} [cause]
   */
  constructor(message, status, cause) {
    super(message, { cause });
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Busca os dados de monitoramento de um paciente.
 * Devolve o JSON cru; a normalização fica em `domain/normalize.js`.
 */
export async function fetchPatientDashboard(patientId, { signal, limit } = {}) {
  const url = new URL(`/api/dashboard/patient/${encodeURIComponent(patientId)}`, API_BASE_URL);
  if (limit) url.searchParams.set('limit', String(limit));

  let response;
  try {
    response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new ApiError(
      `Não foi possível conectar à API em ${API_BASE_URL}. Verifique se o backend está em execução.`,
      0,
      error,
    );
  }

  if (response.status === 404) {
    throw new ApiError(`Paciente "${patientId}" não encontrado.`, 404);
  }
  if (!response.ok) {
    throw new ApiError(`A API respondeu com erro (HTTP ${response.status}).`, response.status);
  }

  try {
    return await response.json();
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new ApiError('A API devolveu uma resposta em formato inválido.', response.status, error);
  }
}
