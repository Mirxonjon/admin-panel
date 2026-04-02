import { clearAuthTokens, getAccessToken } from '../auth/tokenStorage';

function withTrailingSlash(url) {
  return url.endsWith('/') ? url : `${url}/`;
}

function joinUrl(baseUrl, path) {
  const base = withTrailingSlash(baseUrl);
  const p = String(path ?? '').replace(/^\/+/, '');
  return `${base}${p}`;
}

function getApiBaseUrl() {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  if (baseUrl) return withTrailingSlash(String(baseUrl).trim());

  const protocol = (import.meta.env.VITE_API_PROTOCOL || 'https').toString().trim();
  const host = (import.meta.env.VITE_API_HOST || '').toString().trim();
  const port = (import.meta.env.VITE_API_PORT || '').toString().trim();

  if (!host) {
    throw new Error(
      'API base URL is not configured. Set VITE_API_BASE_URL (recommended) or VITE_API_HOST (+ optional VITE_API_PORT) in your env.'
    );
  }

  const portPart = port ? `:${port}` : '';
  return withTrailingSlash(`${protocol}://${host}${portPart}`);
}

async function parseJsonSafely(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export class ApiError extends Error {
  constructor(message, { status, url, data } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.url = url;
    this.data = data;
  }
}

/**
 * Universal fetch wrapper for the whole app.
 *
 * Usage:
 *   const data = await apiFetch('stations', { method: 'GET' })
 *   const data = await apiFetch('auth/login', { method: 'POST', body: { username, password } })
 */
export async function apiFetch(path, options = {}) {
  const {
    method = 'GET',
    params,
    headers,
    body,
    signal,
    credentials,
    ...rest
  } = options;

  const baseUrl = getApiBaseUrl();
  const url = new URL(joinUrl(baseUrl, path));

  if (params && typeof params === 'object') {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }

  const finalHeaders = new Headers(headers || {});
  const hasBody = body !== undefined && body !== null && method !== 'GET' && method !== 'HEAD';
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const token = getAccessToken();
  if (token && !finalHeaders.has('Authorization')) {
    finalHeaders.set('Authorization', `Bearer ${token}`);
  }

  let finalBody = undefined;
  if (hasBody) {
    if (isFormData) {
      finalBody = body;
    } else if (typeof body === 'string' || body instanceof Blob || body instanceof ArrayBuffer) {
      finalBody = body;
    } else {
      if (!finalHeaders.has('Content-Type')) {
        finalHeaders.set('Content-Type', 'application/json');
      }
      finalBody = JSON.stringify(body);
    }
  }

  if (!finalHeaders.has('Accept')) {
    finalHeaders.set('Accept', 'application/json');
  }

  const response = await fetch(url.toString(), {
    method,
    headers: finalHeaders,
    body: finalBody,
    signal,
    credentials,
    ...rest,
  });

  if (response.status === 204) return null;

  const data = await parseJsonSafely(response);

  if (!response.ok) {
    if (response.status === 401) {
      clearAuthTokens();
      // apiFetch can be called outside React, so we use a hard redirect.
      if (typeof window !== 'undefined' && window.location?.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
    const message =
      (data && typeof data === 'object' && (data.message || data.error)) ||
      `${response.status} ${response.statusText}`;
    throw new ApiError(String(message), { status: response.status, url: url.toString(), data });
  }

  return data;
}

