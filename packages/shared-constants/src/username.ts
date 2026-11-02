export const USERNAME_PATTERN = /^[a-z][a-z0-9_]{2,31}$/;
export const USERNAME_DESCRIPTION = 'От 3 до 32 символов: латинские буквы, цифры и _. Первый символ — буква.';

export function normalizeUsername(value: string): string {
  return value.trim().replace(/^@/, '').toLowerCase();
}
