const baseUrl = (process.env.EXPO_PUBLIC_API_URL ?? '').trim().replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message: string, readonly status?: number) { super(message); this.name = 'ApiError'; }
}

export function apiUrl(path: string): string {
  if (!baseUrl) throw new ApiError('Connect ChatNYC to its backend by setting EXPO_PUBLIC_API_URL.');
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try { response = await fetch(apiUrl(path), { ...init, headers: { Accept: 'application/json', ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers } }); }
  catch { throw new ApiError('ChatNYC could not reach the backend. Check your connection and backend URL.'); }
  if (!response.ok) {
    let message = 'This ChatNYC service is temporarily unavailable.';
    try { const body: unknown = await response.json(); if (body && typeof body === 'object' && 'detail' in body && typeof body.detail === 'string') message = body.detail; } catch { /* use safe default */ }
    throw new ApiError(message, response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
