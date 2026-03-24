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

export async function apiFetch(
  endpoint: string,
  options: RequestInit = {},
  token?: string | null
): Promise<Response> {
  const headers: HeadersInit = {
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
    let message = `HTTP ${response.status}`;
    try {
      const error = await response.clone().json();
      message = error.error || message;
    } catch {
      const errorText = await response.text().catch(() => '');
      if (errorText) message = errorText;
    }
    throw new Error(message);
  }

  return response;
}

export async function apiBlob(
  endpoint: string,
  token?: string | null
): Promise<Blob> {
  const response = await apiFetch(endpoint, {}, token);
  return response.blob();
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

  getPatients: (token: string, query?: string) =>
    apiCall<any[]>(`/api/patients${query?.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''}`, {}, token),

  startXraySession: (token: string, data: { patientId: number; toothId: number }) =>
    apiCall<{
      id: number;
      patientId: number;
      patientName: string;
      toothId: number;
      status: 'waiting' | 'completed';
      createdAt: string;
      updatedAt: string;
      completedAt: string | null;
      xray: null | {
        id: number;
        previewUrl: string;
        originalUrl: string;
        previewContentType: string;
        originalContentType: string;
      };
    }>('/api/sessions/start', { method: 'POST', body: JSON.stringify(data) }, token),
  getActiveXraySession: (token: string, sessionId?: number) =>
    apiCall<null | {
      id: number;
      patientId: number;
      patientName: string;
      toothId: number;
      status: 'waiting' | 'completed';
      createdAt: string;
      updatedAt: string;
      completedAt: string | null;
      xray: null | {
        id: number;
        previewUrl: string;
        originalUrl: string;
        previewContentType: string;
        originalContentType: string;
      };
    }>(`/api/sessions/active${sessionId ? `?sessionId=${sessionId}` : ''}`, {}, token),
  getProtectedImageBlob: (token: string, url: string) =>
    apiBlob(url.startsWith('/api/') ? url.slice(4) : url, token),

  getPushCounts: (token: string) =>
    apiCall<{ pushSubscriptions: number; telegramContacts: number }>('/api/push/count', {}, token),
  getNotificationLogs: (token: string) =>
    apiCall<any[]>('/api/notifications/logs', {}, token),
  sendPushToAll: (token: string, data: { title?: string; body: string; url?: string }) =>
    apiCall<{ sent: number; failed: number; total: number }>('/api/push/send', { method: 'POST', body: JSON.stringify(data) }, token),
  sendPushToPhone: (token: string, data: { phone: string; title?: string; body: string; url?: string }) =>
    apiCall<{ sent: number; failed: number; total: number }>('/api/push/send-to', { method: 'POST', body: JSON.stringify(data) }, token),

  getTelegramAppointments: (token: string, date?: string) =>
    apiCall<any[]>(`/api/telegram/appointments${date ? `?date=${date}` : ''}`, {}, token),
  getTelegramPending: (token: string) =>
    apiCall<any[]>('/api/telegram/pending', {}, token),
  getTelegramUpcoming: (token: string) =>
    apiCall<{
      log: string[];
      offsetHours: number;
      windows: { from24: string; to24: string; from1: string; to1: string };
      remind24: number;
      remind1: number;
      appointments24: Array<{ id: number; patient_name: string; appointment_at: string }>;
      appointments1: Array<{ id: number; patient_name: string; appointment_at: string }>;
      dryRun: boolean;
    }>('/api/telegram/debug/upcoming', {}, token),
  triggerTelegramCron: (token: string) =>
    apiCall<{
      log: string[];
      offsetHours: number;
      windows: { from24: string; to24: string; from1: string; to1: string };
      remind24: number;
      remind1: number;
      appointments24: Array<{ id: number; patient_name: string; appointment_at: string }>;
      appointments1: Array<{ id: number; patient_name: string; appointment_at: string }>;
      dryRun: boolean;
    }>('/api/telegram/debug/trigger', { method: 'POST' }, token),
  linkTelegramPhone: (token: string, data: { phone: string; telegram_chat_id: string }) =>
    apiCall<{ updated: number }>('/api/telegram/link', { method: 'POST', body: JSON.stringify(data) }, token),
  sendTelegramMessage: (token: string, data: { chat_id: string; text: string }) =>
    apiCall<{ ok: boolean }>('/api/telegram/send', { method: 'POST', body: JSON.stringify(data) }, token),
};
