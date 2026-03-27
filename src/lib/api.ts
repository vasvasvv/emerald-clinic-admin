import type {
  ApiAppointment,
  ApiAppointmentPayload,
  ApiDoctor,
  ApiLoginResponse,
  ApiNewsItem,
  ApiNotificationLog,
  ApiPatient,
  ApiPushCounts,
  ApiSiteDoctor,
  ApiTelegramAppointment,
  ApiTelegramDebugResult,
  ApiTelegramPending,
  ApiUser,
  ApiXraySession,
} from '@/types/api';

const API_URLS = {
  production: 'https://dentis-univ-api.nesterenkovasil9.workers.dev',
  development: '/proxy-api',
} as const;

const isDev = import.meta.env.DEV;
export const API_URL = isDev ? API_URLS.development : API_URLS.production;
const DOCTOR_PHOTO_UPLOAD_ENDPOINT = import.meta.env.VITE_DOCTOR_PHOTO_UPLOAD_ENDPOINT as string | undefined;
const GET_CACHE_TTL_MS = 15_000;
const getResponseCache = new Map<string, { expiresAt: number; value: unknown }>();
const getInFlightRequests = new Map<string, Promise<unknown>>();

function buildRequestKey(endpoint: string, token?: string | null) {
  return `${token ?? 'anon'}:${endpoint}`;
}

export async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const canUseGetCache = method === 'GET' && !options.signal;
  const requestKey = canUseGetCache ? buildRequestKey(endpoint, token) : null;

  if (requestKey) {
    const cached = getResponseCache.get(requestKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value as T;
    }

    const pending = getInFlightRequests.get(requestKey);
    if (pending) {
      return pending as Promise<T>;
    }
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const execute = async () => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        const { clearAdminSession } = await import('./auth');
        clearAdminSession();
        window.location.href = '/login';
        throw new Error('Session expired');
      }

      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    if (requestKey) {
      getResponseCache.set(requestKey, { expiresAt: Date.now() + GET_CACHE_TTL_MS, value: data });
    }
    return data as T;
  };

  if (!requestKey) {
    return execute();
  }

  const pending = execute().finally(() => getInFlightRequests.delete(requestKey));
  getInFlightRequests.set(requestKey, pending);
  return pending;
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
    if (response.status === 401) {
      const { clearAdminSession } = await import('./auth');
      clearAdminSession();
      window.location.href = '/login';
      throw new Error('Session expired');
    }

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
    apiCall<ApiLoginResponse>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    ),

  getAppointments: (token: string, date?: string) =>
    apiCall<ApiAppointment[]>(`/api/appointments${date ? `?date=${date}` : ''}`, {}, token),
  createAppointment: (token: string, data: ApiAppointmentPayload) =>
    apiCall<ApiAppointment>('/api/appointments', { method: 'POST', body: JSON.stringify(data) }, token),
  updateAppointment: (token: string, id: number, data: ApiAppointmentPayload) =>
    apiCall<ApiAppointment>(`/api/appointments/${id}`, { method: 'PUT', body: JSON.stringify(data) }, token),
  deleteAppointment: (token: string, id: number) =>
    apiCall<{ ok: boolean }>(`/api/appointments/${id}`, { method: 'DELETE' }, token),

  getNews: (token: string) =>
    apiCall<ApiNewsItem[]>('/api/news', {}, token),
  createNews: (token: string, data: Record<string, unknown>) =>
    apiCall<ApiNewsItem>('/api/news', { method: 'POST', body: JSON.stringify(data) }, token),
  updateNews: (token: string, id: number, data: Record<string, unknown>) =>
    apiCall<ApiNewsItem>(`/api/news/${id}`, { method: 'PUT', body: JSON.stringify(data) }, token),
  deleteNews: (token: string, id: number) =>
    apiCall<{ ok: boolean }>(`/api/news/${id}`, { method: 'DELETE' }, token),

  getSiteDoctors: (token: string) =>
    apiCall<ApiSiteDoctor[]>('/api/site/doctors', {}, token),
  createSiteDoctor: (token: string, data: Record<string, unknown>) =>
    apiCall<ApiSiteDoctor>('/api/site/doctors', { method: 'POST', body: JSON.stringify(data) }, token),
  updateSiteDoctor: (token: string, id: number, data: Record<string, unknown>) =>
    apiCall<ApiSiteDoctor>(`/api/site/doctors/${id}`, { method: 'PUT', body: JSON.stringify(data) }, token),
  deleteSiteDoctor: (token: string, id: number) =>
    apiCall<{ ok: boolean }>(`/api/site/doctors/${id}`, { method: 'DELETE' }, token),
  uploadDoctorPhoto: async (token: string, file: File) => {
    if (!DOCTOR_PHOTO_UPLOAD_ENDPOINT) {
      throw new Error('Photo upload endpoint is not configured. Set VITE_DOCTOR_PHOTO_UPLOAD_ENDPOINT.');
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await apiFetch(
      DOCTOR_PHOTO_UPLOAD_ENDPOINT,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
        },
        body: formData,
      },
      token,
    );

    const data = await response.json().catch(() => ({})) as {
      url?: string;
      photo_url?: string;
      result?: { url?: string; variants?: string[] };
    };

    const uploadedUrl = data.url ?? data.photo_url ?? data.result?.url ?? data.result?.variants?.[0];
    if (!uploadedUrl) {
      throw new Error('Upload succeeded but photo URL is missing in response.');
    }

    return uploadedUrl;
  },

  getSystemDoctors: (token: string) =>
    apiCall<ApiDoctor[]>('/api/doctors', {}, token),

  getUsers: (token: string) =>
    apiCall<ApiUser[]>('/api/users', {}, token),

  getPatients: (token: string, query?: string) =>
    apiCall<ApiPatient[]>(`/api/patients${query?.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''}`, {}, token),
  createPatient: (token: string, data: Record<string, unknown>) =>
    apiCall<ApiPatient>('/api/patients', { method: 'POST', body: JSON.stringify(data) }, token),
  searchPatients: (token: string, query: string, limit = 20, signal?: AbortSignal) =>
    apiCall<ApiPatient[]>(
      `/api/patients/search?q=${encodeURIComponent(query.trim())}&limit=${limit}`,
      { signal },
      token,
    ),

  startXraySession: (token: string, data: { patientId: number; toothId: number }) =>
    apiCall<ApiXraySession>('/api/sessions/start', { method: 'POST', body: JSON.stringify(data) }, token),
  getActiveXraySession: (token: string, sessionId?: number) =>
    apiCall<ApiXraySession | null>(`/api/sessions/active${sessionId ? `?sessionId=${sessionId}` : ''}`, {}, token),
  getProtectedImageBlob: (token: string, url: string) =>
    apiBlob(url.startsWith('/api/') ? url.slice(4) : url, token),

  getPushCounts: (token: string) =>
    apiCall<ApiPushCounts>('/api/push/count', {}, token),
  getNotificationLogs: (token: string) =>
    apiCall<ApiNotificationLog[]>('/api/notifications/logs', {}, token),
  sendPushToAll: (token: string, data: { title?: string; body: string; url?: string }) =>
    apiCall<{ sent: number; failed: number; total: number }>('/api/push/send', { method: 'POST', body: JSON.stringify(data) }, token),
  sendPushToPhone: (token: string, data: { phone: string; title?: string; body: string; url?: string }) =>
    apiCall<{ sent: number; failed: number; total: number }>('/api/push/send-to', { method: 'POST', body: JSON.stringify(data) }, token),

  getTelegramAppointments: (token: string, date?: string) =>
    apiCall<ApiTelegramAppointment[]>(`/api/telegram/appointments${date ? `?date=${date}` : ''}`, {}, token),
  getTelegramPending: (token: string) =>
    apiCall<ApiTelegramPending[]>('/api/telegram/pending', {}, token),
  getTelegramUpcoming: (token: string) =>
    apiCall<ApiTelegramDebugResult>('/api/telegram/debug/upcoming', {}, token),
  triggerTelegramCron: (token: string) =>
    apiCall<ApiTelegramDebugResult>('/api/telegram/debug/trigger', { method: 'POST' }, token),
  linkTelegramPhone: (token: string, data: { phone: string; telegram_chat_id: string }) =>
    apiCall<{ updated: number }>('/api/telegram/link', { method: 'POST', body: JSON.stringify(data) }, token),
  sendTelegramMessage: (token: string, data: { chat_id: string; text: string }) =>
    apiCall<{ ok: boolean }>('/api/telegram/send', { method: 'POST', body: JSON.stringify(data) }, token),
};
