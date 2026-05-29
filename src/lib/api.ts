// Tiny typed fetch wrapper for the ClimaCore backend.
// Reads VITE_API_URL from .env (falls back to localhost dev port).

const API_BASE: string =
  ((import.meta as unknown as { env?: { VITE_API_URL?: string } }).env
    ?.VITE_API_URL ?? 'http://localhost:4000') + '/api/v1';

const ACCESS_KEY = 'cc_access_token';
const REFRESH_KEY = 'cc_refresh_token';

export const tokens = {
  getAccess: (): string | null => localStorage.getItem(ACCESS_KEY),
  getRefresh: (): string | null => localStorage.getItem(REFRESH_KEY),
  set(access: string, refresh: string) {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface RequestOpts {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Send Authorization: Bearer header from saved access token. */
  auth?: boolean;
  /** Extra headers to merge in. */
  headers?: Record<string, string>;
}

export async function api<T = unknown>(
  path: string,
  opts: RequestOpts = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers ?? {}),
  };

  if (opts.auth) {
    const t = tokens.getAccess();
    if (t) headers['Authorization'] = `Bearer ${t}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch (networkErr) {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      `Cannot reach ${API_BASE} — is the backend running?`,
    );
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON response */
  }

  if (!res.ok) {
    const code = data?.error?.code ?? 'HTTP_' + res.status;
    const message =
      data?.error?.message ?? res.statusText ?? `Request failed (${res.status})`;
    throw new ApiError(res.status, code, message, data?.error?.details);
  }

  return data as T;
}
