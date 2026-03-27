import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export function usePushCounts() {
  const { token } = useAuth();

  return useQuery({
    queryKey: ['push-counts'],
    queryFn: () => api.getPushCounts(token!),
    enabled: Boolean(token),
  });
}

export function useNotificationLogs() {
  const { token } = useAuth();

  return useQuery({
    queryKey: ['notification-logs'],
    queryFn: () => api.getNotificationLogs(token!),
    enabled: Boolean(token),
  });
}

export function useTelegramAppointments(date?: string, enabled = true) {
  const { token } = useAuth();

  return useQuery({
    queryKey: ['telegram-appointments', date],
    queryFn: () => api.getTelegramAppointments(token!, date),
    enabled: Boolean(token) && enabled,
  });
}

export function useTelegramPending(enabled = true) {
  const { token } = useAuth();

  return useQuery({
    queryKey: ['telegram-pending'],
    queryFn: () => api.getTelegramPending(token!),
    enabled: Boolean(token) && enabled,
  });
}

export function useTelegramDebug(enabled = true) {
  const { token } = useAuth();

  return useQuery({
    queryKey: ['telegram-debug'],
    queryFn: () => api.getTelegramUpcoming(token!),
    enabled: Boolean(token) && enabled,
  });
}

export function useSendPushToAll() {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  return useMutation({
    mutationFn: (data: { title?: string; body: string; url?: string }) => api.sendPushToAll(token!, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notification-logs'] });
      void queryClient.invalidateQueries({ queryKey: ['push-counts'] });
    },
  });
}

export function useSendPushToPhone() {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  return useMutation({
    mutationFn: (data: { phone: string; title?: string; body: string; url?: string }) => api.sendPushToPhone(token!, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notification-logs'] });
      void queryClient.invalidateQueries({ queryKey: ['push-counts'] });
    },
  });
}

export function useSendTelegramMessage() {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  return useMutation({
    mutationFn: (data: { chat_id: string; text: string }) => api.sendTelegramMessage(token!, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notification-logs'] });
    },
  });
}

export function useLinkTelegramPhone() {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  return useMutation({
    mutationFn: (data: { phone: string; telegram_chat_id: string }) => api.linkTelegramPhone(token!, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['telegram-pending'] });
      void queryClient.invalidateQueries({ queryKey: ['telegram-appointments'] });
      void queryClient.invalidateQueries({ queryKey: ['telegram-debug'] });
      void queryClient.invalidateQueries({ queryKey: ['notification-logs'] });
      void queryClient.invalidateQueries({ queryKey: ['push-counts'] });
    },
  });
}

export function useTriggerTelegramCron() {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  return useMutation({
    mutationFn: () => api.triggerTelegramCron(token!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['telegram-debug'] });
      void queryClient.invalidateQueries({ queryKey: ['notification-logs'] });
      void queryClient.invalidateQueries({ queryKey: ['push-counts'] });
    },
  });
}
