import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { ApiAppointmentPayload } from '@/types/api';

// 30 секунд stale — сервер кешує записи по даті на 30с
// фронт не повинен робити зайвий запит при кожному focus/re-mount
const APPOINTMENTS_STALE_MS = 30_000;

export function useAppointments(date?: string) {
  const { token } = useAuth();

  return useQuery({
    queryKey: ['appointments', date],
    queryFn: () => api.getAppointments(token!, date),
    enabled: Boolean(token),
    staleTime: APPOINTMENTS_STALE_MS,
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  return useMutation({
    mutationFn: (data: ApiAppointmentPayload) => api.createAppointment(token!, data),
    onSuccess: (_result, variables) => {
      // Інвалідуємо тільки потрібну дату
      const date = variables.appointment_at?.slice(0, 10);
      void queryClient.invalidateQueries({ queryKey: ['appointments', date] });
    },
  });
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ApiAppointmentPayload }) => api.updateAppointment(token!, id, data),
    onSuccess: (_result, variables) => {
      const date = variables.data.appointment_at?.slice(0, 10);
      void queryClient.invalidateQueries({ queryKey: ['appointments', date] });
    },
  });
}

export function useDeleteAppointment() {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  return useMutation({
    mutationFn: (id: number) => api.deleteAppointment(token!, id),
    onSuccess: () => {
      // Для delete не знаємо дату — інвалідуємо всі appointments
      void queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}
