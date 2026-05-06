import { useMemo } from 'react';
import { DEFAULT_ROLE_PERMISSIONS } from '@corp/shared-constants';
import { useAuthStore } from '@/stores/auth.store';
import { useOrganizationStore, type OrgRoleRaw } from '@/stores/organization.store';

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
  const userId = useAuthStore((s) => s.user?.id);
  const members = useOrganizationStore((s) => s.members);
  const currentOrg = useOrganizationStore((s) => s.currentOrg);

  return useMemo(() => {
    const me = members.find((m) => m.userId === userId);
    const role = resolveRoleRaw(me?.roleRaw, me?.role);
    const granted = role
      ? (DEFAULT_ROLE_PERMISSIONS[role] as readonly string[])
      : ([] as readonly string[]);
    return {
      role,
      orgId: currentOrg?.id ?? null,
      has: (permission: string) => granted.includes(permission),
    };
  }, [userId, members, currentOrg]);
}
