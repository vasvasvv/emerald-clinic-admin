export const AUTH_FLAG_KEY = 'dental_admin_auth';
export const TOKEN_KEY = 'dental_admin_token';
export const USER_KEY = 'dental_admin_user';
export const AUTH_CHANGED_EVENT = 'emerald-auth-changed';

export function getAdminToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getAdminUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function isAdminAuthenticated() {
  return localStorage.getItem(AUTH_FLAG_KEY) === 'true' && Boolean(getAdminToken());
}

export function setAdminSession(token: string, user: unknown) {
  localStorage.setItem(AUTH_FLAG_KEY, 'true');
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function clearAdminSession() {
  localStorage.removeItem(AUTH_FLAG_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}
