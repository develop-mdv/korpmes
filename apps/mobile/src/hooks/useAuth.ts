import { useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../stores/auth.store';
import * as authApi from '../api/auth.api';

export function useAuth(): { login: (email: string, password: string, twoFactorCode?: string) => Promise<{ requiresTwoFactor: boolean }>; register: (payload: authApi.RegisterPayload) => Promise<void>; logout: () => Promise<void>; token: string | null; user: any; isLoading: boolean; error: string | null } {
  const { setAuth, setLoading, logout: clearAuth, token, user, isLoading } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(
    async (email: string, password: string, twoFactorCode?: string) => {
      try {
        setError(null);
        setLoading(true);
        const response = await authApi.login({ email, password, twoFactorCode });
        if (response.requiresTwoFactor) {
          return { requiresTwoFactor: true };
        }

        await AsyncStorage.multiSet([
          ['auth_token', response.accessToken],
          ['refresh_token', response.refreshToken],
        ]);
        setAuth(response.accessToken, response.user, response.refreshToken);
        return { requiresTwoFactor: false };
      } catch (err: any) {
        const message = err.response?.data?.message || 'Login failed';
        setError(message);
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    [setAuth, setLoading],
  );

  const register = useCallback(
    async (payload: authApi.RegisterPayload) => {
      try {
        setError(null);
        setLoading(true);
        const response = await authApi.register(payload);
        await AsyncStorage.multiSet([
          ['auth_token', response.accessToken],
          ['refresh_token', response.refreshToken],
        ]);
        setAuth(response.accessToken, response.user, response.refreshToken);
      } catch (err: any) {
        const message = err.response?.data?.message || 'Registration failed';
        setError(message);
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    [setAuth, setLoading],
  );

  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove(['auth_token', 'refresh_token']);
    clearAuth();
  }, [clearAuth]);

  return { login, register, logout, token, user, isLoading, error };
}
