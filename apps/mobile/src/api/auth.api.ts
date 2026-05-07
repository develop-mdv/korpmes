import { apiClient } from './client';

export interface LoginPayload {
  email: string;
  password: string;
  twoFactorCode?: string;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  requiresTwoFactor?: boolean;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    twoFactorEnabled?: boolean;
  };
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/login', payload);
  return data;
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/register', payload);
  return data;
}

export async function getMe(): Promise<AuthResponse['user']> {
  const { data } = await apiClient.get<AuthResponse['user']>('/auth/me');
  return data;
}

export async function forgotPassword(email: string): Promise<void> {
  await apiClient.post('/auth/forgot-password', { email });
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await apiClient.post('/auth/reset-password', { token, password });
}

export async function setup2FA(): Promise<{ secret: string; otpauthUrl: string }> {
  const { data } = await apiClient.post<{ secret: string; otpauthUrl: string }>('/auth/2fa/setup');
  return data;
}

export async function verify2FA(code: string): Promise<{ message: string }> {
  const { data } = await apiClient.post<{ message: string }>('/auth/2fa/verify', { code });
  return data;
}

export async function disable2FA(code: string): Promise<{ message: string }> {
  const { data } = await apiClient.post<{ message: string }>('/auth/2fa/disable', { code });
  return data;
}
