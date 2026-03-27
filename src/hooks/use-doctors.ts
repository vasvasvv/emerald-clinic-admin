import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export function useSystemDoctors() {
  const { token } = useAuth();

  return useQuery({
    queryKey: ['system-doctors'],
    queryFn: () => api.getSystemDoctors(token!),
    enabled: Boolean(token),
  });
}

export function useSiteDoctors() {
  const { token } = useAuth();

  return useQuery({
    queryKey: ['site-doctors'],
    queryFn: () => api.getSiteDoctors(token!),
    enabled: Boolean(token),
  });
}

export function useCreateSiteDoctor() {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.createSiteDoctor(token!, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['site-doctors'] });
    },
  });
}

export function useUpdateSiteDoctor() {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      api.updateSiteDoctor(token!, id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['site-doctors'] });
    },
  });
}

export function useDeleteSiteDoctor() {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  return useMutation({
    mutationFn: (id: number) => api.deleteSiteDoctor(token!, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['site-doctors'] });
    },
  });
}
