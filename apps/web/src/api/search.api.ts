import { apiClient } from './client';

export interface SearchParams {
  q: string;
  scope: 'messages' | 'files' | 'tasks' | 'members' | 'all';
  orgId: string;
  chatId?: string;
  dateFrom?: string;
  dateTo?: string;
  cursor?: string;
  limit?: number;
}

export interface SearchResult {
  type: 'message' | 'file' | 'task' | 'member';
  id: string;
  title: string;
  snippet: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface SearchResponse {
  results: SearchResult[];
  cursor?: string;
  hasMore: boolean;
  total: number;
}

export function search(params: SearchParams): Promise<SearchResponse> {
  return apiClient.get('/search', { params }).then((r) => r.data);
}
