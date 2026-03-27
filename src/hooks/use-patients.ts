import { useMutation } from '@tanstack/react-query';
import { api, apiCall } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { ApiPatient, ApiPatientPayload } from '@/types/api';

export function useSearchPatients() {
  const { token } = useAuth();

  return useMutation({
    mutationFn: ({ query, limit, signal }: { query: string; limit?: number; signal?: AbortSignal }) =>
      api.searchPatients(token!, query, limit, signal),
  });
}

export function useCreatePatient() {
  const { token } = useAuth();

  return useMutation({
    mutationFn: (data: ApiPatientPayload) => api.createPatient(token!, data as Record<string, unknown>),
  });
}

export function useCreatePatientLegacy() {
  const { token } = useAuth();

  return useMutation({
    mutationFn: (data: ApiPatientPayload) =>
      apiCall<ApiPatient>('/api/patients', { method: 'POST', body: JSON.stringify(data) }, token!),
  });
}
