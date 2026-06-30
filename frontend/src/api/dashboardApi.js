export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export async function fetchPatientDashboard(patientId, { signal } = {}) {
  const url = `${API_BASE_URL}/api/dashboard/patient/${encodeURIComponent(patientId)}`;
  let response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });
  } catch (networkError) {
    throw new ApiError(
      `Não foi possível conectar à API em ${API_BASE_URL}. Verifique se o backend está em execução.`,
      0,
      networkError,
    );
  }
  if (response.status === 404 || response.status === 500) {
    throw new ApiError(`Paciente "${patientId}" não encontrado.`, response.status);
  }
  if (!response.ok) {
    throw new ApiError(`A API respondeu com erro (HTTP ${response.status}).`, response.status);
  }
  return response.json();
}

export class ApiError extends Error {
  constructor(message, status, cause) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.cause = cause;
  }
}