import { useMutation } from '@tanstack/react-query';
import { api, apiCall } from '@/lib/api';
import { getAdminToken } from '@/lib/auth';
import type { ApiPatient, ApiPatientPayload } from '@/types/api';

export function useSearchPatients() {
  const token = getAdminToken();

  return useMutation({
    mutationFn: ({ query, limit, signal }: { query: string; limit?: number; signal?: AbortSignal }) =>
      api.searchPatients(token!, query, limit, signal),
  });
}

export function useCreatePatient() {
  const token = getAdminToken();

  return useMutation({
    mutationFn: (data: ApiPatientPayload) => api.createPatient(token!, data as Record<string, unknown>),
  });
}

export function useCreatePatientLegacy() {
  const token = getAdminToken();

  return useMutation({
    mutationFn: (data: ApiPatientPayload) =>
      apiCall<ApiPatient>('/api/patients', { method: 'POST', body: JSON.stringify(data) }, token!),
  });
}
