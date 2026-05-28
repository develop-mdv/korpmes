import { apiClient } from './client';

export interface Organization {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export type OrgRoleRaw = 'OWNER' | 'ADMIN' | 'MANAGER' | 'EMPLOYEE' | 'GUEST';

export interface OrganizationMember {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'member';
  roleRaw?: OrgRoleRaw;
  department?: string;
  joinedAt: string;
}

export interface InviteMemberData {
  email: string;
  role?: 'admin' | 'member';
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

export async function getOrganizations(): Promise<Organization[]> {
  const { data } = await apiClient.get<Organization[]>('/organizations');
  return data;
}

export async function createOrganization(input: {
  name: string;
  slug: string;
  description?: string;
}): Promise<Organization> {
  const { data } = await apiClient.post<Organization>('/organizations', input);
  return data;
}

export async function updateOrganization(
  id: string,
  input: Partial<Pick<Organization, 'name' | 'description'>>,
): Promise<Organization> {
  const { data } = await apiClient.patch<Organization>(`/organizations/${id}`, input);
  return data;
}

export async function getMembers(
  orgId: string,
  page = 1,
  limit = 100,
): Promise<{ members: OrganizationMember[]; total: number }> {
  const { data } = await apiClient.get<{ members: OrganizationMember[]; total: number }>(
    `/organizations/${orgId}/members`,
    { params: { page, limit } },
  );
  return data;
}

export async function inviteMember(orgId: string, input: InviteMemberData): Promise<void> {
  await apiClient.post(`/organizations/${orgId}/members/invite`, input);
}

export async function changeRole(orgId: string, userId: string, role: 'admin' | 'member'): Promise<void> {
  await apiClient.patch(`/organizations/${orgId}/members/${userId}/role`, { role });
}

export async function removeMember(orgId: string, userId: string): Promise<void> {
  await apiClient.delete(`/organizations/${orgId}/members/${userId}`);
}

export async function listJoinRequests(orgId: string): Promise<JoinRequest[]> {
  const { data } = await apiClient.get<JoinRequest[]>(`/organizations/${orgId}/join-requests`);
  return data;
}

export async function approveJoinRequest(orgId: string, requestId: string): Promise<JoinRequest> {
  const { data } = await apiClient.patch<JoinRequest>(
    `/organizations/${orgId}/join-requests/${requestId}/approve`,
  );
  return data;
}

export async function rejectJoinRequest(orgId: string, requestId: string): Promise<JoinRequest> {
  const { data } = await apiClient.patch<JoinRequest>(
    `/organizations/${orgId}/join-requests/${requestId}/reject`,
  );
  return data;
}

export async function getInviteLink(orgId: string): Promise<InviteLinkInfo | null> {
  const { data } = await apiClient.get<InviteLinkInfo | null>(`/organizations/${orgId}/invite-link`);
  return data;
}

export async function createInviteLink(orgId: string): Promise<InviteLinkInfo> {
  const { data } = await apiClient.post<InviteLinkInfo>(`/organizations/${orgId}/invite-link`);
  return data;
}

export async function revokeInviteLink(orgId: string): Promise<void> {
  await apiClient.delete(`/organizations/${orgId}/invite-link`);
}

export async function getInviteInfo(token: string): Promise<InvitePublicInfo | null> {
  const { data } = await apiClient.get<InvitePublicInfo | null>(
    `/organizations/invites/${token}/info`,
  );
  return data;
}

export async function acceptInvite(token: string): Promise<void> {
  await apiClient.post(`/organizations/invites/${token}/accept`);
}
