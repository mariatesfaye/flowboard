import { apiFetch } from '@/lib/api';
import type { User } from '@/types';

export function fetchMe() {
  return apiFetch<User>('/auth/me');
}

export function login(data: { email: string; password: string }) {
  return apiFetch<{ user: User }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function register(data: {
  name: string;
  email: string;
  password: string;
}) {
  return apiFetch<{ user: User }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function logout() {
  return apiFetch<{ success: boolean }>('/auth/logout', { method: 'POST' });
}
