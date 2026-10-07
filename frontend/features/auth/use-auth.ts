'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMe, login, logout, register } from './api';

export function useAuth() {
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchMe,
    retry: false,
  });

  return {
    user: meQuery.data,
    isLoading: meQuery.isLoading,
    isAuthenticated: !!meQuery.data,
    refetch: meQuery.refetch,
    async loginWithEmail(email: string, password: string) {
      const { user } = await login({ email, password });
      queryClient.setQueryData(['auth', 'me'], user);
      return user;
    },
    async registerWithEmail(
      name: string,
      email: string,
      password: string,
    ) {
      const { user } = await register({ name, email, password });
      queryClient.setQueryData(['auth', 'me'], user);
      return user;
    },
    async signOut() {
      await logout();
      queryClient.setQueryData(['auth', 'me'], null);
      queryClient.clear();
    },
  };
}
