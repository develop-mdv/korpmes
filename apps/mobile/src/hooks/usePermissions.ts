import { useMemo } from 'react';
import { DEFAULT_ROLE_PERMISSIONS } from '@corp/shared-constants';
import { useAuthStore } from '../stores/auth.store';
import { useOrganizationStore } from '../stores/organization.store';
import type { OrgRoleRaw } from '../api/organizations.api';

const PUBLIC_ROLE_TO_RAW: Record<string, OrgRoleRaw> = {
  owner: 'OWNER',
  admin: 'ADMIN',
  member: 'EMPLOYEE',
};

function resolveRoleRaw(role: string | undefined, fallback: string | undefined): OrgRoleRaw | null {
  if (role && /^(OWNER|ADMIN|MANAGER|EMPLOYEE|GUEST)$/.test(role)) {
    return role as OrgRoleRaw;
  }
  if (fallback && PUBLIC_ROLE_TO_RAW[fallback]) {
    return PUBLIC_ROLE_TO_RAW[fallback];
  }
  return null;
}

export function usePermissions() {
  const userId = useAuthStore((state) => state.user?.id);
  const members = useOrganizationStore((state) => state.members);
  const currentOrg = useOrganizationStore((state) => state.currentOrg);

  return useMemo(() => {
    const me = members.find((member) => member.userId === userId);
    const role = resolveRoleRaw(me?.roleRaw, me?.role);
    const granted = role ? (DEFAULT_ROLE_PERMISSIONS[role] as readonly string[]) : [];

    return {
      role,
      orgId: currentOrg?.id ?? null,
      has: (permission: string) => granted.includes(permission),
    };
  }, [currentOrg?.id, members, userId]);
}
