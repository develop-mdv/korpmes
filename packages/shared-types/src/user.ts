export enum UserStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  AWAY = 'AWAY',
  BUSY = 'BUSY',
  DO_NOT_DISTURB = 'DO_NOT_DISTURB',
  IN_MEETING = 'IN_MEETING',
  ON_VACATION = 'ON_VACATION',
}

export interface User {
  id: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  status: UserStatus;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  twoFactorEnabled: boolean;
  lastSeenAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile extends User {
  position?: string;
  department?: string;
}

export interface UserPreferences {
  language: string;
  timezone: string;
  theme: string;
  notificationSettings: Record<string, boolean>;
}
