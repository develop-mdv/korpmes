import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import * as authApi from '@/api/auth.api';
import { disconnectSocket } from '@/socket/socket';

export function useAuth() {
  const navigate = useNavigate();
  const { user, accessToken, setAuth, logout: clearAuth } = useAuthStore();
  const isAuthenticated = !!accessToken;

  const login = useCallback(
    async (email: string, password: string, twoFactorCode?: string) => {
      const response = await authApi.login(email, password, twoFactorCode);
      if (response.requiresTwoFactor) {
        return { requiresTwoFactor: true };
      }
      setAuth(response.user as any, {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      });
      navigate('/chats');
      return { requiresTwoFactor: false };
    },
    [setAuth, navigate],
  );

  const register = useCallback(
    async (data: authApi.RegisterData) => {
      const response = await authApi.register(data);
      setAuth(response.user as any, {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      });
      navigate('/chats');
    },
    [setAuth, navigate],
  );

  const logout = useCallback(async () => {
    const refreshToken = useAuthStore.getState().refreshToken;
    try {
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch {
      // Ignore logout API errors
    } finally {
      disconnectSocket();
      clearAuth();
      navigate('/login');
    }
  }, [clearAuth, navigate]);

  return { user, isAuthenticated, login, register, logout };
}
