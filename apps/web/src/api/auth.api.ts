import { apiClient } from './client';

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    phone?: string;
    twoFactorEnabled: boolean;
  };
  accessToken: string;
  refreshToken: string;
  requiresTwoFactor?: boolean;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
}

export function login(email: string, password: string, twoFactorCode?: string): Promise<LoginResponse> {
  return apiClient.post('/auth/login', { email, password, twoFactorCode }).then((r) => r.data);
}

export function register(data: RegisterData): Promise<LoginResponse> {
  return apiClient.post('/auth/register', data).then((r) => r.data);
}

export function refreshToken(token: string): Promise<{ accessToken: string; refreshToken: string }> {
  return apiClient.post('/auth/refresh', { refreshToken: token }).then((r) => r.data);
}

export function logout(refreshTokenValue: string): Promise<void> {
  return apiClient.post('/auth/logout', { refreshToken: refreshTokenValue }).then((r) => r.data);
}

export function forgotPassword(email: string): Promise<{ message: string }> {
  return apiClient.post('/auth/forgot-password', { email }).then((r) => r.data);
}

export function resetPassword(token: string, password: string): Promise<{ message: string }> {
  return apiClient.post('/auth/reset-password', { token, password }).then((r) => r.data);
}

export function setup2FA(): Promise<{ secret: string; qrCodeUrl: string }> {
  return apiClient.post('/auth/2fa/setup').then((r) => r.data);
}

export function verify2FA(code: string): Promise<{ message: string }> {
  return apiClient.post('/auth/2fa/verify', { code }).then((r) => r.data);
}

export function disable2FA(code: string): Promise<{ message: string }> {
  return apiClient.post('/auth/2fa/disable', { code }).then((r) => r.data);
}
