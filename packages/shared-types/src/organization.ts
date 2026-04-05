import { OrgRole } from './rbac';

export enum InviteStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  settings: Record<string, any>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  parentDepartmentId?: string;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: OrgRole;
  departmentId?: string;
  joinedAt: string;
}

export interface Invite {
  id: string;
  organizationId: string;
  email?: string;
  phone?: string;
  role: OrgRole;
  token: string;
  status: InviteStatus;
  expiresAt: string;
}
