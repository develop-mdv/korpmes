import { apiClient } from './client';
import type { AuthResponse } from './auth.api';

export function getMe(): Promise<AuthResponse['user']> {
  return apiClient.get('/users/me').then((response) => response.data);
}

export function updateMe(data: { username: string; firstName: string; lastName: string; phone: string | null }): Promise<AuthResponse['user']> {
  return apiClient.patch('/users/me', data).then((response) => response.data);
}
