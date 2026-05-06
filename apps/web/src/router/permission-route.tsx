import { Navigate, Outlet } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';

interface PermissionRouteProps {
  permission: string;
  redirectTo?: string;
}

export function PermissionRoute({ permission, redirectTo = '/chats' }: PermissionRouteProps) {
  const { has, role } = usePermissions();
  if (role === null) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          color: 'var(--color-text-secondary)',
        }}
      >
        Проверка прав…
      </div>
    );
  }
  if (!has(permission)) {
    return <Navigate to={redirectTo} replace />;
  }
  return <Outlet />;
}
