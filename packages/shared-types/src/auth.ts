import { User } from './user';

export interface LoginRequest {
  email?: string;
  phone?: string;
  password: string;
  twoFactorCode?: string;
}

export interface RegisterRequest {
  email: string;
  phone?: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  requiresTwoFactor?: boolean;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}
