import { CSSProperties } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { useUIStore } from '@/stores/ui.store';
import { useOrganizationStore } from '@/stores/organization.store';
import { Avatar } from '@/components/common/Avatar';
import { useAuth } from '@/hooks/useAuth';

const navItems = [
  { path: '/chats', label: 'Chats', icon: '\u{1F4AC}' },
  { path: '/tasks', label: 'Tasks', icon: '\u{2705}' },
  { path: '/calls', label: 'Calls', icon: '\u{1F4DE}' },
  { path: '/files', label: 'Files', icon: '\u{1F4C2}' },
  { path: '/notifications', label: 'Notifications', icon: '\u{1F514}' },
  { path: '/search', label: 'Search', icon: '\u{1F50D}' },
  { path: '/organization', label: 'Organization', icon: '\u{1F3E2}' },
  { path: '/audit', label: 'Audit Log', icon: '\u{1F4CB}' },
  { path: '/settings', label: 'Settings', icon: '\u{2699}' },
];

export function Sidebar() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const user = useAuthStore((s) => s.user);
  const organizations = useOrganizationStore((s) => s.organizations);
  const currentOrg = useOrganizationStore((s) => s.currentOrg);
  const setCurrentOrg = useOrganizationStore((s) => s.setCurrentOrg);
  const { logout } = useAuth();

  const sidebarStyle: CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    width: sidebarOpen ? 260 : 72,
    backgroundColor: 'var(--color-bg-secondary)',
    borderRight: '1px solid var(--color-border)',
    display: 'flex',
    flexDirection: 'column',
    transition: 'width 0.2s ease',
    zIndex: 100,
    overflow: 'hidden',
  };

  const logoAreaStyle: CSSProperties = {
    padding: '16px 16px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    borderBottom: '1px solid var(--color-border)',
  };

  const logoTextStyle: CSSProperties = {
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--color-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  };

  const toggleBtnStyle: CSSProperties = {
    background: 'none',
    border: 'none',
    fontSize: 18,
    color: 'var(--color-text-secondary)',
    cursor: 'pointer',
    marginLeft: 'auto',
    padding: 4,
  };

  const orgSwitcherStyle: CSSProperties = {
    padding: '12px 16px',
    borderBottom: '1px solid var(--color-border)',
  };

  const selectStyle: CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text)',
    fontSize: 13,
    cursor: 'pointer',
  };

  const navStyle: CSSProperties = {
    flex: 1,
    padding: '12px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    overflowY: 'auto',
  };

  const linkBaseStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 12px',
    borderRadius: 'var(--radius-md)',
    textDecoration: 'none',
    color: 'var(--color-text-secondary)',
    fontSize: 14,
    fontWeight: 500,
    transition: 'background 0.15s, color 0.15s',
    whiteSpace: 'nowrap',
  };

  const userAreaStyle: CSSProperties = {
    padding: '12px 16px',
    borderTop: '1px solid var(--color-border)',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  };

  const userInfoStyle: CSSProperties = {
    flex: 1,
    overflow: 'hidden',
    display: sidebarOpen ? 'block' : 'none',
  };

  const logoutBtnStyle: CSSProperties = {
    background: 'none',
    border: 'none',
    color: 'var(--color-text-tertiary)',
    cursor: 'pointer',
    fontSize: 14,
    padding: '4px 8px',
    borderRadius: 'var(--radius-sm)',
    display: sidebarOpen ? 'block' : 'none',
  };

  return (
    <aside style={sidebarStyle}>
      <div style={logoAreaStyle}>
        <span style={{ fontSize: 24, color: 'var(--color-primary)' }}>C</span>
        {sidebarOpen && <span style={logoTextStyle}>CorpMessenger</span>}
        <button style={toggleBtnStyle} onClick={toggleSidebar} aria-label="Toggle sidebar">
          {sidebarOpen ? '\u{25C0}' : '\u{25B6}'}
        </button>
      </div>

      {sidebarOpen && organizations.length > 0 && (
        <div style={orgSwitcherStyle}>
          <select
            style={selectStyle}
            value={currentOrg?.id || ''}
            onChange={(e) => {
              const org = organizations.find((o) => o.id === e.target.value);
              if (org) setCurrentOrg(org);
            }}
          >
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <nav style={navStyle}>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }: { isActive: boolean }) => ({
              ...linkBaseStyle,
              backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
              color: isActive ? '#fff' : 'var(--color-text-secondary)',
              justifyContent: sidebarOpen ? 'flex-start' : 'center',
            })}
          >
            <span style={{ fontSize: 18 }}>{item.icon}</span>
            {sidebarOpen && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div style={userAreaStyle}>
        <Avatar name={user ? `${user.firstName} ${user.lastName}` : 'U'} size="sm" online />
        <div style={userInfoStyle}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
            {user ? `${user.firstName} ${user.lastName}` : 'User'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-success)' }}>Online</div>
        </div>
        <button style={logoutBtnStyle} onClick={logout}>
          Logout
        </button>
      </div>
    </aside>
  );
}
