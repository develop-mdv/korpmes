import { apiClient } from './client';

export interface Organization {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMember {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'member';
  department?: string;
  joinedAt: string;
}

export interface InviteMemberData {
  email: string;
  role?: 'admin' | 'member';
}

export function getOrganizations(): Promise<Organization[]> {
  return apiClient.get('/organizations').then((r) => r.data);
}

export function createOrganization(data: { name: string; slug: string; description?: string }): Promise<Organization> {
  return apiClient.post('/organizations', data).then((r) => r.data);
}

export function getOrganization(id: string): Promise<Organization> {
  return apiClient.get(`/organizations/${id}`).then((r) => r.data);
}

export function updateOrganization(id: string, data: Partial<Pick<Organization, 'name' | 'description'>>): Promise<Organization> {
  return apiClient.patch(`/organizations/${id}`, data).then((r) => r.data);
}

export function getMembers(orgId: string, page = 1, limit = 50): Promise<{ members: OrganizationMember[]; total: number }> {
  return apiClient.get(`/organizations/${orgId}/members`, { params: { page, limit } }).then((r) => r.data);
}

export function inviteMember(orgId: string, data: InviteMemberData): Promise<void> {
  return apiClient.post(`/organizations/${orgId}/members/invite`, data).then((r) => r.data);
}

export function changeRole(orgId: string, userId: string, role: string): Promise<void> {
  return apiClient.patch(`/organizations/${orgId}/members/${userId}/role`, { role }).then((r) => r.data);
}

export function removeMember(orgId: string, userId: string): Promise<void> {
  return apiClient.delete(`/organizations/${orgId}/members/${userId}`).then((r) => r.data);
}

export function searchOrganizations(query: string): Promise<Organization[]> {
  return apiClient.get('/organizations/search', { params: { q: query } }).then((r) => r.data);
}

export function requestJoin(orgId: string): Promise<void> {
  return apiClient.post(`/organizations/${orgId}/join-request`).then((r) => r.data);
}
