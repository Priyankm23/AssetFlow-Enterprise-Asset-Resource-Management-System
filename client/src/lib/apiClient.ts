import { mockData } from './mockData';

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:4000/api';

export const USE_MOCK =
  (import.meta.env.VITE_USE_MOCK as string | undefined) !== 'false';

export class ApiError extends Error {
  code: string;
  status: number;
  details?: Record<string, string>;
  currentHolder?: unknown;
  conflictingBooking?: unknown;

  constructor(
    message: string,
    code: string,
    status: number,
    extras?: { details?: Record<string, string>; currentHolder?: unknown; conflictingBooking?: unknown },
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    if (extras) {
      this.details = extras.details;
      this.currentHolder = extras.currentHolder;
      this.conflictingBooking = extras.conflictingBooking;
    }
  }
}

const TOKEN_KEY = 'assetflow_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

type Envelope<T> = { success: true; data: T } | { success: false; error: { code: string; message: string; details?: Record<string, string>; currentHolder?: unknown } };

let onUnauthorized: (() => void) | null = null;
export function registerUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

async function realFetch<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const isFormData = body instanceof FormData;
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? (isFormData ? (body as any) : JSON.stringify(body)) : undefined,
  });

  let parsed: Envelope<T>;
  try {
    parsed = await res.json();
  } catch {
    throw new ApiError('Invalid server response', 'PARSE_ERROR', res.status);
  }

  if (!parsed.success) {
    if (res.status === 401 && onUnauthorized) onUnauthorized();
    throw new ApiError(parsed.error.message, parsed.error.code, res.status, {
      details: parsed.error.details,
      currentHolder: parsed.error.currentHolder,
      conflictingBooking: (parsed.error as any).conflictingBooking,
    });
  }
  return parsed.data;
}

// ---- Mock layer: simulates latency + envelope + conflict codes ----
function delay(ms = 280) {
  return new Promise((r) => setTimeout(r, ms));
}

async function mockFetch<T>(method: string, path: string, body?: unknown): Promise<T> {
  await delay();
  return mockData.handle<T>(method, path, body);
}

export async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (USE_MOCK) return mockFetch<T>(method, path, body);
  return realFetch<T>(method, path, body);
}

// Convenience verbs
export const apiGet = <T>(path: string) => api<T>('GET', path);
export const apiPost = <T>(path: string, body?: unknown) => api<T>('POST', path, body);
export const apiPut = <T>(path: string, body?: unknown) => api<T>('PUT', path, body);
export const apiPatch = <T>(path: string, body?: unknown) => api<T>('PATCH', path, body);
