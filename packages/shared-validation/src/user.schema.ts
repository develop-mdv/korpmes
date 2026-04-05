import { z } from 'zod';
import { passwordSchema } from './common';

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  avatarUrl: z.string().url().optional(),
  position: z.string().max(100).optional(),
  timezone: z.string().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: passwordSchema,
});

export const updateStatusSchema = z.object({
  status: z.enum(['ONLINE', 'AWAY', 'BUSY', 'OFFLINE']),
  customText: z.string().max(100).optional(),
});

export const userPreferencesSchema = z.object({
  language: z.string().optional(),
  timezone: z.string().optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
});
