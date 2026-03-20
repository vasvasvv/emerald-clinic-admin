const API_URLS = {
  production: 'https://dentis-univ-api.nesterenkovasil9.workers.dev',
  development: '/proxy-api',
} as const;

const isDev = import.meta.env.DEV;
export const API_URL = isDev ? API_URLS.development : API_URLS.production;

export async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  login: (email: string, password: string) =>
    apiCall<{ token: string; user: { id: number; email: string; fullName: string; role: string } }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    ),

  getAppointments: (token: string, date?: string) =>
    apiCall<any[]>(`/api/appointments${date ? `?date=${date}` : ''}`, {}, token),
  createAppointment: (token: string, data: any) =>
    apiCall<any>('/api/appointments', { method: 'POST', body: JSON.stringify(data) }, token),
  updateAppointment: (token: string, id: number, data: any) =>
    apiCall<any>(`/api/appointments/${id}`, { method: 'PUT', body: JSON.stringify(data) }, token),
  deleteAppointment: (token: string, id: number) =>
    apiCall<{ ok: boolean }>(`/api/appointments/${id}`, { method: 'DELETE' }, token),

  getNews: (token: string) =>
    apiCall<any[]>('/api/news', {}, token),
  createNews: (token: string, data: any) =>
    apiCall<any>('/api/news', { method: 'POST', body: JSON.stringify(data) }, token),
  updateNews: (token: string, id: number, data: any) =>
    apiCall<any>(`/api/news/${id}`, { method: 'PUT', body: JSON.stringify(data) }, token),
  deleteNews: (token: string, id: number) =>
    apiCall<{ ok: boolean }>(`/api/news/${id}`, { method: 'DELETE' }, token),

  getSiteDoctors: (token: string) =>
    apiCall<any[]>('/api/site/doctors', {}, token),
  createSiteDoctor: (token: string, data: any) =>
    apiCall<any>('/api/site/doctors', { method: 'POST', body: JSON.stringify(data) }, token),
  updateSiteDoctor: (token: string, id: number, data: any) =>
    apiCall<any>(`/api/site/doctors/${id}`, { method: 'PUT', body: JSON.stringify(data) }, token),
  deleteSiteDoctor: (token: string, id: number) =>
    apiCall<{ ok: boolean }>(`/api/site/doctors/${id}`, { method: 'DELETE' }, token),

  getSystemDoctors: (token: string) =>
    apiCall<any[]>('/api/doctors', {}, token),

  getUsers: (token: string) =>
    apiCall<any[]>('/api/users', {}, token),

  getPatients: (token: string) =>
    apiCall<any[]>('/api/patients', {}, token),

  getPushCounts: (token: string) =>
    apiCall<{ pushSubscriptions: number; telegramContacts: number }>('/api/push/count', {}, token),
  getNotificationLogs: (token: string) =>
    apiCall<any[]>('/api/notifications/logs', {}, token),
  sendPushToAll: (token: string, data: { title?: string; body: string; url?: string }) =>
    apiCall<{ sent: number; failed: number; total: number }>('/api/push/send', { method: 'POST', body: JSON.stringify(data) }, token),
  sendPushToPhone: (token: string, data: { phone: string; title?: string; body: string; url?: string }) =>
    apiCall<{ sent: number; failed: number; total: number }>('/api/push/send-to', { method: 'POST', body: JSON.stringify(data) }, token),
};
