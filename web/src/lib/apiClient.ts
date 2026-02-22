const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details: unknown = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);

  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    if (typeof payload === 'object' && payload !== null) {
      const typedPayload = payload as { error?: unknown; details?: Array<{ message?: unknown }> };
      if (typedPayload.error) {
        message = String(typedPayload.error);
      }

      const firstDetail = typedPayload.details?.[0];
      if (firstDetail?.message) {
        message = `${message}: ${String(firstDetail.message)}`;
      }
    }

    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
}
