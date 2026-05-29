import { api, tokens, ApiError } from './api';

export type Role = 'ADMIN' | 'INSPECTOR' | 'INDUSTRY';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  industryId: string | null;
}

interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt?: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
}

export async function registerUser(input: RegisterInput): Promise<AuthUser> {
  const res = await api<AuthResponse>('/auth/register', {
    method: 'POST',
    body: input,
  });
  tokens.set(res.accessToken, res.refreshToken);
  return res.user;
}

export async function loginUser(
  email: string,
  password: string,
): Promise<AuthUser> {
  const res = await api<AuthResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  tokens.set(res.accessToken, res.refreshToken);
  return res.user;
}

export async function logoutUser(): Promise<void> {
  const refreshToken = tokens.getRefresh();
  if (refreshToken) {
    try {
      await api('/auth/logout', {
        method: 'POST',
        body: { refreshToken },
      });
    } catch {
      /* logout is idempotent — ignore failures */
    }
  }
  tokens.clear();
}

/**
 * Tries to load the current user using a stored access token.
 * Returns null if there's no token or the token is no longer valid.
 */
export async function bootstrapUser(): Promise<AuthUser | null> {
  if (!tokens.getAccess()) return null;
  try {
    const res = await api<{ user: AuthUser }>('/auth/me', { auth: true });
    return res.user;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) tokens.clear();
    return null;
  }
}
