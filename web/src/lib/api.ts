const BASE = import.meta.env.VITE_API_URL ?? '/api';

const KEYS = { access: 'bsq.access', refresh: 'bsq.refresh', user: 'bsq.user' } as const;

export const tokens = {
  get access() {
    return localStorage.getItem(KEYS.access);
  },
  get refresh() {
    return localStorage.getItem(KEYS.refresh);
  },
  set(access: string, refresh: string) {
    localStorage.setItem(KEYS.access, access);
    localStorage.setItem(KEYS.refresh, refresh);
  },
  clear() {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
  },
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public payload?: unknown,
  ) {
    super(message);
  }
}

// One refresh at a time, no matter how many requests hit 401 together.
let refreshing: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const refreshToken = tokens.refresh;
    if (!refreshToken) return false;
    try {
      const res = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      tokens.set(data.accessToken, data.refreshToken);
      localStorage.setItem(KEYS.user, JSON.stringify(data.user));
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

export async function api<T = unknown>(
  path: string,
  init: RequestInit & { raw?: boolean } = {},
): Promise<T> {
  const send = async () => {
    const headers = new Headers(init.headers);
    if (!(init.body instanceof FormData)) headers.set('content-type', 'application/json');
    const access = tokens.access;
    if (access) headers.set('authorization', `Bearer ${access}`);
    return fetch(`${BASE}${path}`, { ...init, headers });
  };

  let res = await send();

  if (res.status === 401 && tokens.refresh) {
    if (await refreshSession()) {
      res = await send();
    } else {
      tokens.clear();
      window.dispatchEvent(new Event('bsq:signed-out'));
    }
  }

  if (init.raw) {
    if (!res.ok) throw new ApiError(res.status, 'That download failed. Try again.');
    return res as unknown as T;
  }

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json() : null;

  if (!res.ok) {
    throw new ApiError(res.status, body?.error ?? 'Something went wrong. Try again.', body);
  }
  return body as T;
}

export const get = <T,>(path: string) => api<T>(path);
export const post = <T,>(path: string, body?: unknown) =>
  api<T>(path, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body ?? {}) });
export const put = <T,>(path: string, body: unknown) =>
  api<T>(path, { method: 'PUT', body: JSON.stringify(body) });
export const patch = <T,>(path: string, body: unknown) =>
  api<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
export const del = <T,>(path: string) => api<T>(path, { method: 'DELETE' });
