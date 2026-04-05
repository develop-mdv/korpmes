import { z } from 'zod';
import { emailSchema, phoneSchema, passwordSchema } from './common';

export const registerSchema = z.object({
  email: emailSchema,
  phone: phoneSchema.optional(),
  password: passwordSchema,
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
});

export const loginSchema = z.object({
  email: z.string().email().optional(),
  phone: phoneSchema.optional(),
  password: z.string(),
  twoFactorCode: z.string().length(6).optional(),
}).refine(
  (data) => data.email || data.phone,
  { message: 'Either email or phone must be provided' },
);

export const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  password: passwordSchema,
});

export const verifyEmailSchema = z.object({
  token: z.string(),
});

export const twoFactorSetupSchema = z.object({
  password: z.string(),
});

export const twoFactorVerifySchema = z.object({
  code: z.string().length(6),
});
