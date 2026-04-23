import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export function useStartXraySession() {
  const { token } = useAuth();

  return useMutation({
    mutationFn: (data: { patientId: number; toothId: number; captureType: 'twin' | 'scanner' }) =>
      api.startXraySession(token!, data),
  });
}

export function useActiveXraySession(sessionId?: number, enabled = true) {
  const { token } = useAuth();

  return useQuery({
    queryKey: ['xray-session', sessionId],
    queryFn: () => api.getActiveXraySession(token!, sessionId),
    enabled: Boolean(token) && Boolean(sessionId) && enabled,
    refetchInterval: enabled ? 3000 : false,
  });
}
