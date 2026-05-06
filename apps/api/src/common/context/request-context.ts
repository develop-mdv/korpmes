import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  ip: string | null;
  userId: string | null;
}

export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}

export function extractIp(req: any): string | null {
  const xff = req?.headers?.['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    return xff.split(',')[0].trim();
  }
  if (Array.isArray(xff) && xff.length > 0) {
    return String(xff[0]).trim();
  }
  return req?.ip ?? req?.connection?.remoteAddress ?? null;
}
