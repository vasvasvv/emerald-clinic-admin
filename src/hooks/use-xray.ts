import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export function useStartXraySession() {
  const { token } = useAuth();

  return useMutation({
    mutationFn: (data: { patientId: number; toothId: number; captureType?: 'twin' | 'scanner' }) =>
      api.startXraySession(token!, {
        patientId: data.patientId,
        toothId: data.toothId,
        captureType: data.captureType ?? 'twin',
      }),
  });
}

export function useActiveXraySession(sessionId?: number, enabled = true) {
  const { token } = useAuth();

  return useQuery({
    queryKey: ['xray-session', sessionId],
    queryFn: () => api.getActiveXraySession(token!, sessionId),
    enabled: Boolean(token) && Boolean(sessionId) && enabled,
    // Не кешуємо стан сесії — polling повинен завжди бачити актуальний стан
    staleTime: 0,
    refetchInterval: (query) =>
      enabled && query.state.data?.status === 'waiting' && !query.state.data?.xray ? 5000 : false,
  });
}
