import { useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../stores/auth.store';
import * as authApi from '../api/auth.api';

export function useAuth(): { login: (email: string, password: string) => Promise<void>; register: (payload: authApi.RegisterPayload) => Promise<void>; logout: () => Promise<void>; token: string | null; user: any; isLoading: boolean; error: string | null } {
  const { setAuth, setLoading, logout: clearAuth, token, user, isLoading } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        setError(null);
        setLoading(true);
        const response = await authApi.login({ email, password });
        await AsyncStorage.setItem('auth_token', response.token);
        setAuth(response.token, response.user);
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
        await AsyncStorage.setItem('auth_token', response.token);
        setAuth(response.token, response.user);
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
    await AsyncStorage.removeItem('auth_token');
    clearAuth();
  }, [clearAuth]);

  return { login, register, logout, token, user, isLoading, error };
}
