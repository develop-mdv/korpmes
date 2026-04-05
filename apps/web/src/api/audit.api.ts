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

export async function getAuditLogs(params: {
  orgId: string;
  page?: number;
  limit?: number;
  action?: string;
  userId?: string;
}): Promise<AuditLogsResponse> {
  const q = new URLSearchParams();
  q.set('orgId', params.orgId);
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  if (params.action) q.set('action', params.action);
  if (params.userId) q.set('userId', params.userId);

  const res = await apiClient.get<AuditLogsResponse>(`/audit/logs?${q}`);
  return res.data;
}
