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

export async function getAuditLogs(params: AuditQuery): Promise<AuditLogsResponse> {
  const { data } = await apiClient.get<AuditLogsResponse>('/audit/logs', { params });
  return data;
}

export async function exportAuditLogs(params: Omit<AuditQuery, 'page' | 'limit'>): Promise<ArrayBuffer> {
  const { data } = await apiClient.get<ArrayBuffer>('/audit/logs/export', {
    params,
    responseType: 'arraybuffer',
  });
  return data;
}
