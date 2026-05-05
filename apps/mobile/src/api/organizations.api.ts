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

export async function getInviteInfo(token: string): Promise<InvitePublicInfo | null> {
  const { data } = await apiClient.get<InvitePublicInfo | null>(
    `/organizations/invites/${token}/info`,
  );
  return data;
}

export async function acceptInvite(token: string): Promise<void> {
  await apiClient.post(`/organizations/invites/${token}/accept`);
}
