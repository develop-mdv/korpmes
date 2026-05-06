import { apiClient } from './client';

export interface AuditLogItem {
  id: string;
  userId: string;
  userEmail: string;
  organizationId: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface AuditLogsResponse {
  items: AuditLogItem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface AuditQuery {
  orgId: string;
  page?: number;
  limit?: number;
  action?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  q?: string;
}

function buildParams(params: AuditQuery): URLSearchParams {
  const q = new URLSearchParams();
  q.set('orgId', params.orgId);
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  if (params.action) q.set('action', params.action);
  if (params.userId) q.set('userId', params.userId);
  if (params.dateFrom) q.set('dateFrom', params.dateFrom);
  if (params.dateTo) q.set('dateTo', params.dateTo);
  if (params.q) q.set('q', params.q);
  return q;
}

export async function getAuditLogs(params: AuditQuery): Promise<AuditLogsResponse> {
  const res = await apiClient.get<AuditLogsResponse>(`/audit/logs?${buildParams(params)}`);
  return res.data;
}

export async function exportAuditLogs(params: Omit<AuditQuery, 'page' | 'limit'>): Promise<Blob> {
  const res = await apiClient.get<Blob>(`/audit/logs/export?${buildParams(params as AuditQuery)}`, {
    responseType: 'blob',
  });
  return res.data;
}
