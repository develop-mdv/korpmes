import { z } from 'zod';

export const usernameSchema = z.string().trim().transform((value) => value.replace(/^@/, '').toLowerCase())
  .pipe(z.string().regex(/^[a-z][a-z0-9_]{2,31}$/, 'От 3 до 32 символов: латинские буквы, цифры и _. Первый символ — буква.'));
