/**
 * EXMARK ERP — Centralized API Client with Signed Session Persistence
 * Compatible with Browser, Electron Desktop, and Mobile (Capacitor) runtimes.
 */

const AUTH_TOKEN_KEY = 'exmark_erp_auth_token';
const AUTH_USER_KEY = 'exmark_erp_auth_user';

function isValidSignedClientToken(token: string | null): token is string {
  return Boolean(token && token.startsWith('v2.') && token.indexOf('.', 3) > 3);
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(AUTH_TOKEN_KEY) || sessionStorage.getItem(AUTH_TOKEN_KEY) || null;
  if (raw && !isValidSignedClientToken(raw)) {
    // Discard stale unsigned legacy tokens from pre-hardening builds
    clearAuthToken();
    return null;
  }
  return raw;
}

export function setAuthToken(token: string, user?: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    sessionStorage.setItem(AUTH_TOKEN_KEY, token);
    if (user) {
      const userStr = JSON.stringify(user);
      localStorage.setItem(AUTH_USER_KEY, userStr);
      sessionStorage.setItem(AUTH_USER_KEY, userStr);
    }
  } catch (e) {
    console.warn('[apiClient] Could not save token to storage:', e);
  }
}

export function clearAuthToken(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    sessionStorage.removeItem(AUTH_USER_KEY);
  } catch (e) {
    console.warn('[apiClient] Could not clear storage:', e);
  }
}

export function getStoredUser<T = unknown>(): T | null {
  if (typeof window === 'undefined') return null;
  if (!getAuthToken()) return null;
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY) || sessionStorage.getItem(AUTH_USER_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Legacy export kept for backwards compatibility; no longer synthesizes Super Admin tokens.
 */
export function ensureDefaultAuth(): string {
  return getAuthToken() || '';
}

/**
 * Universal authenticated fetch.
 * Automatically injects Bearer token header (if present) and credentials: 'include' for HTTP-only cookies.
 */
export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  const token = getAuthToken();

  if (token && !headers.has('Authorization') && !headers.has('authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Ensure Content-Type default when sending JSON body
  if (init.body && typeof init.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const mergedInit: RequestInit = {
    ...init,
    headers,
    credentials: init.credentials || 'include',
  };

  const response = await fetch(input, mergedInit);

  if (response.status === 401 && typeof window !== 'undefined') {
    const reqUrl = typeof input === 'string' ? input : input.toString();
    if (!reqUrl.includes('/api/auth/login') && !window.location.pathname.startsWith('/login')) {
      clearAuthToken();
    }
  }

  return response;
}
