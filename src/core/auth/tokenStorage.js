const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || null;
}

export function setAccessToken(token) {
  if (!token) return;
  localStorage.setItem(ACCESS_TOKEN_KEY, String(token));
}

export function clearAccessToken() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY) || null;
}

export function setRefreshToken(token) {
  if (!token) return;
  localStorage.setItem(REFRESH_TOKEN_KEY, String(token));
}

export function clearRefreshToken() {
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function clearAuthTokens() {
  clearAccessToken();
  clearRefreshToken();
}

