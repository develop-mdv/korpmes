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

export interface JoinRequest {
  id: string;
  organizationId: string;
  userId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  message: string | null;
  respondedBy: string | null;
  respondedAt: string | null;
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string;
  };
}

export function requestJoin(orgId: string, message?: string): Promise<JoinRequest> {
  return apiClient
    .post(`/organizations/${orgId}/join-request`, { message })
    .then((r) => r.data);
}

export function listJoinRequests(orgId: string): Promise<JoinRequest[]> {
  return apiClient.get(`/organizations/${orgId}/join-requests`).then((r) => r.data);
}

export function getMyPendingRequest(orgId: string): Promise<JoinRequest | null> {
  return apiClient.get(`/organizations/${orgId}/join-requests/me`).then((r) => r.data);
}

export function getMyAllPendingRequests(): Promise<JoinRequest[]> {
  return apiClient.get('/organizations/join-requests/me').then((r) => r.data);
}

export function approveJoinRequest(orgId: string, requestId: string): Promise<JoinRequest> {
  return apiClient
    .patch(`/organizations/${orgId}/join-requests/${requestId}/approve`)
    .then((r) => r.data);
}

export function rejectJoinRequest(orgId: string, requestId: string): Promise<JoinRequest> {
  return apiClient
    .patch(`/organizations/${orgId}/join-requests/${requestId}/reject`)
    .then((r) => r.data);
}

export interface InviteLinkInfo {
  invite: {
    id: string;
    organizationId: string;
    token: string;
    type: string;
    role: string;
    status: string;
    revokedAt: string | null;
    createdAt: string;
  };
  url: string;
}

export interface InvitePublicInfo {
  organizationId: string;
  organizationName: string;
  organizationLogo: string | null;
  type: string;
}

export function getInviteLink(orgId: string): Promise<InviteLinkInfo | null> {
  return apiClient.get(`/organizations/${orgId}/invite-link`).then((r) => r.data);
}

export function createInviteLink(orgId: string): Promise<InviteLinkInfo> {
  return apiClient.post(`/organizations/${orgId}/invite-link`).then((r) => r.data);
}

export function revokeInviteLink(orgId: string): Promise<void> {
  return apiClient.delete(`/organizations/${orgId}/invite-link`).then((r) => r.data);
}

export function getInviteInfo(token: string): Promise<InvitePublicInfo | null> {
  return apiClient.get(`/organizations/invites/${token}/info`).then((r) => r.data);
}

export function acceptInvite(token: string): Promise<void> {
  return apiClient
    .post(`/organizations/invites/${token}/accept`)
    .then((r) => r.data);
}
