import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { ApiAppointmentPayload } from '@/types/api';

export function useAppointments(date?: string) {
  const { token } = useAuth();

  return useQuery({
    queryKey: ['appointments', date],
    queryFn: () => api.getAppointments(token!, date),
    enabled: Boolean(token),
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  return useMutation({
    mutationFn: (data: ApiAppointmentPayload) => api.createAppointment(token!, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ApiAppointmentPayload }) =>
      api.updateAppointment(token!, id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

export function useDeleteAppointment() {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  return useMutation({
    mutationFn: (id: number) => api.deleteAppointment(token!, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}
