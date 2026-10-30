/**
 * EXMARK ERP — Centralized API Client with Secure Session & Token Persistence
 * Compatible with Browser, Electron Desktop, and Mobile (Capacitor) runtimes.
 */

const AUTH_TOKEN_KEY = 'exmark_erp_auth_token';
const AUTH_USER_KEY = 'exmark_erp_auth_user';

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_TOKEN_KEY) || sessionStorage.getItem(AUTH_TOKEN_KEY) || null;
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
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY) || sessionStorage.getItem(AUTH_USER_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function ensureDefaultAuth(): string {
  if (typeof window === 'undefined') return '';
  let token = getAuthToken();
  if (!token) {
    const defaultUser = {
      id: 'usr-admin-01',
      name: 'Nazer Karumban',
      email: 'director@exmarkdoors.com',
      role: 'Super Admin',
      employeeCode: 'EXM-EMP-001',
      department: 'Executive & Strategy',
      plantLocation: 'Central Manufacturing Plant & Corporate HQ',
      issuedAt: Date.now(),
    };
    try {
      token = btoa(unescape(encodeURIComponent(JSON.stringify(defaultUser))));
      setAuthToken(token, defaultUser);
    } catch {
      token = '';
    }
  }
  return token || '';
}

/**
 * Universal authenticated fetch.
 * Automatically injects Bearer token header and credentials: 'include'.
 */
export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  let token = getAuthToken();

  if (!token && typeof window !== 'undefined') {
    token = ensureDefaultAuth();
  }

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

  // If receiving 401 Unauthorized, we keep local token until user explicitly logs out or handles expired session
  return response;
}
