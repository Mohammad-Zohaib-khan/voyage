import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, setCsrfToken } from '../../lib/api';
import type { User } from '../../lib/types';

export const sessionKey = ['session'] as const;

export function useSession() {
  const query = useQuery({
    queryKey: sessionKey,
    queryFn: ({ signal }) => api.get<User | null>('/auth/me', signal),
    staleTime: 5 * 60_000,
    retry: 1,
  });
  return { user: query.data ?? null, isLoading: query.isPending, isError: query.isError, refetch: query.refetch };
}

interface AuthResult {
  user: User;
  csrfToken: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput extends LoginInput {
  displayName: string;
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) => api.post<AuthResult>('/auth/login', input),
    onSuccess: ({ user, csrfToken }) => {
      // The session ID and CSRF token rotate on sign-in; drop anything cached for a previous visitor.
      setCsrfToken(csrfToken);
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'destinations' && query.queryKey[0] !== 'facets' });
      queryClient.setQueryData(sessionKey, user);
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterInput) => api.post<AuthResult>('/auth/register', input),
    onSuccess: ({ user, csrfToken }) => {
      setCsrfToken(csrfToken);
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'destinations' && query.queryKey[0] !== 'facets' });
      queryClient.setQueryData(sessionKey, user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ signedOut: boolean }>('/auth/logout'),
    onSettled: () => {
      // Clear every user-specific cache entry, even if the request failed part-way.
      setCsrfToken(null);
      queryClient.clear();
      queryClient.setQueryData(sessionKey, null);
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { displayName?: string; preferences?: Partial<User['preferences']> }) => api.patch<User>('/users/me', input),
    onSuccess: (user) => {
      queryClient.setQueryData(sessionKey, user);
    },
  });
}
