import { Injectable } from '@nestjs/common';
import { MembersService } from '../organizations/members.service';
import { DEFAULT_ROLE_PERMISSIONS, ROLE_HIERARCHY } from '@corp/shared-constants';

@Injectable()
export class RbacService {
  constructor(private readonly membersService: MembersService) {}

  async getUserRole(userId: string, orgId: string): Promise<string | null> {
    return this.membersService.getUserRole(orgId, userId);
  }

  async hasPermission(
    userId: string,
    orgId: string,
    permission: string,
  ): Promise<boolean> {
    const role = await this.getUserRole(userId, orgId);
    if (!role) return false;

    const permissions = DEFAULT_ROLE_PERMISSIONS[role as keyof typeof DEFAULT_ROLE_PERMISSIONS];
    if (!permissions) return false;

    return permissions.includes(permission as any);
  }

  async hasAllPermissions(
    userId: string,
    orgId: string,
    permissions: string[],
  ): Promise<boolean> {
    const role = await this.getUserRole(userId, orgId);
    if (!role) return false;

    const rolePermissions = DEFAULT_ROLE_PERMISSIONS[role as keyof typeof DEFAULT_ROLE_PERMISSIONS];
    if (!rolePermissions) return false;

    return permissions.every((p) => rolePermissions.includes(p as any));
  }

  async hasAnyPermission(
    userId: string,
    orgId: string,
    permissions: string[],
  ): Promise<boolean> {
    const role = await this.getUserRole(userId, orgId);
    if (!role) return false;

    const rolePermissions = DEFAULT_ROLE_PERMISSIONS[role as keyof typeof DEFAULT_ROLE_PERMISSIONS];
    if (!rolePermissions) return false;

    return permissions.some((p) => rolePermissions.includes(p as any));
  }

  canManageRole(actorRole: string, targetRole: string): boolean {
    const actorLevel = ROLE_HIERARCHY[actorRole] ?? 0;
    const targetLevel = ROLE_HIERARCHY[targetRole] ?? 0;
    return actorLevel > targetLevel;
  }
}
