import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getAdminToken } from '@/lib/auth';

export function useStartXraySession() {
  const token = getAdminToken();

  return useMutation({
    mutationFn: (data: { patientId: number; toothId: number }) => api.startXraySession(token!, data),
  });
}

export function useActiveXraySession(sessionId?: number, enabled = true) {
  const token = getAdminToken();

  return useQuery({
    queryKey: ['xray-session', sessionId],
    queryFn: () => api.getActiveXraySession(token!, sessionId),
    enabled: Boolean(token) && Boolean(sessionId) && enabled,
    refetchInterval: enabled ? 3000 : false,
  });
}
