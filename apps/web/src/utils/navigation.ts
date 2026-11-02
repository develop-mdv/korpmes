export function authRedirect(next: string | null): string {
  return next?.startsWith('/') && !next.startsWith('//') && !next.includes('\\') ? next : '/chats';
}
