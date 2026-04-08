import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { ApiPatientPayload } from '@/types/api';

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
