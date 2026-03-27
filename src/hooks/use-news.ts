import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export function useNews() {
  const { token } = useAuth();

  return useQuery({
    queryKey: ['news'],
    queryFn: () => api.getNews(token!),
    enabled: Boolean(token),
  });
}

export function useCreateNews() {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.createNews(token!, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['news'] });
    },
  });
}

export function useUpdateNews() {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => api.updateNews(token!, id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['news'] });
    },
  });
}

export function useDeleteNews() {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  return useMutation({
    mutationFn: (id: number) => api.deleteNews(token!, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['news'] });
    },
  });
}
