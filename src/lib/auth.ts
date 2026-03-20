const AUTH_FLAG_KEY = 'dental_admin_auth';
const TOKEN_KEY = 'dental_admin_token';
const USER_KEY = 'dental_admin_user';

export function getAdminToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function isAdminAuthenticated() {
  return localStorage.getItem(AUTH_FLAG_KEY) === 'true' && Boolean(getAdminToken());
}

export function clearAdminSession() {
  localStorage.removeItem(AUTH_FLAG_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
