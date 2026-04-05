export enum SearchScope {
  ALL = 'ALL',
  MESSAGES = 'MESSAGES',
  USERS = 'USERS',
  FILES = 'FILES',
  TASKS = 'TASKS',
  CHATS = 'CHATS',
}

export interface SearchRequest {
  query: string;
  scope: SearchScope;
  organizationId: string;
  chatId?: string;
  dateFrom?: string;
  dateTo?: string;
  cursor?: string;
  limit?: number;
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  cursor?: string;
  hasMore: boolean;
}
