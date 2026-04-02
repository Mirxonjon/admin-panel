import { ApiError } from './apiFetch';

function extractBackendMessage(err) {
  if (!err) return '';
  if (typeof err === 'string') return err;

  const data = err?.data;
  const candidates = [
    err?.message,
    data?.message,
    data?.error,
    data?.detail,
    data?.title,
  ];

  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return '';
}

function isNetworkError(err) {
  const msg = (err?.message || '').toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('load failed') ||
    msg.includes('network request failed')
  );
}

export function getUserFriendlyErrorMessage(err, t) {
  const tr = typeof t === 'function' ? t : (k) => k;

  if (isNetworkError(err)) return tr('error_network');

  const backendMessage = extractBackendMessage(err);
  const msgLower = backendMessage.toLowerCase();

  // Login-related common backend messages
  if (msgLower.includes('invalid credentials') || msgLower.includes('invalid credential')) {
    return tr('error_invalid_credentials');
  }
  if (msgLower.includes('user not found') || msgLower.includes('not found')) {
    return tr('error_user_not_found');
  }

  if (err instanceof ApiError) {
    if (err.status === 401) return tr('error_invalid_credentials');
    if (err.status === 403) return tr('error_forbidden');
    if (err.status === 404) return tr('error_user_not_found');
    if (err.status === 422) return tr('error_validation');
    if (err.status >= 500) return tr('error_server');
  }

  // If backend returned a meaningful message, show it, but fallback to generic
  return backendMessage || tr('error_unknown');
}

