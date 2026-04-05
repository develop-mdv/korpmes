import { apiClient } from './client';

export interface UserSearchResult {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  status?: string;
  position?: string;
}

export function searchUsers(query: string, orgId: string): Promise<UserSearchResult[]> {
  return apiClient.get('/users/search', { params: { q: query, orgId } }).then((r) => r.data);
}

export function getMe(): Promise<UserSearchResult> {
  return apiClient.get('/users/me').then((r) => r.data);
}

export interface UpdateMeDto {
  firstName?: string;
  lastName?: string;
  position?: string;
  timezone?: string;
  avatarUrl?: string;
}

export function updateMe(dto: UpdateMeDto): Promise<UserSearchResult> {
  return apiClient.patch('/users/me', dto).then((r) => r.data);
}

export function updateStatus(status: string): Promise<UserSearchResult> {
  return apiClient.patch('/users/me/status', { status }).then((r) => r.data);
}
