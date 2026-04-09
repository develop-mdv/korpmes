import { ReactNode } from 'react';
import clsx from 'clsx';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { useUIStore } from '@/stores/ui.store';
import { useOrganizationStore } from '@/stores/organization.store';
import { Avatar } from '@/components/common/Avatar';
import { useAuth } from '@/hooks/useAuth';

type NavItem = {
  path: string;
  label: string;
  caption: string;
  icon: ReactNode;
};

function LineIcon({ children }: { children: ReactNode }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

const navItems: NavItem[] = [
  {
    path: '/chats',
    label: 'Чаты',
    caption: 'Личные линии',
    icon: (
      <LineIcon>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </LineIcon>
    ),
  },
  {
    path: '/tasks',
    label: 'Задачи',
    caption: 'Контур исполнения',
    icon: (
      <LineIcon>
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </LineIcon>
    ),
  },
  {
    path: '/calls',
    label: 'Звонки',
    caption: 'Живое присутствие',
    icon: (
      <LineIcon>
        <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.1 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.4 1.8.6 2.8.7a2 2 0 0 1 1.7 2.1z" />
      </LineIcon>
    ),
  },
  {
    path: '/files',
    label: 'Файлы',
    caption: 'Общее хранилище',
    icon: (
      <LineIcon>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v1" />
      </LineIcon>
    ),
  },
  {
    path: '/notifications',
    label: 'Сигналы',
    caption: 'Приоритетные события',
    icon: (
      <LineIcon>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </LineIcon>
    ),
  },
  {
    path: '/search',
    label: 'Поиск',
    caption: 'Глобальный обзор',
    icon: (
      <LineIcon>
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </LineIcon>
    ),
  },
  {
    path: '/organization',
    label: 'Организация',
    caption: 'Структура',
    icon: (
      <LineIcon>
        <path d="M3 21h18" />
        <path d="M5 21V7l7-4 7 4v14" />
        <path d="M9 9h.01" />
        <path d="M15 9h.01" />
      </LineIcon>
    ),
  },
  {
    path: '/audit',
    label: 'Аудит',
    caption: 'Журнал контроля',
    icon: (
      <LineIcon>
        <path d="M9 12h6" />
        <path d="M9 16h6" />
        <path d="M9 8h6" />
        <path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      </LineIcon>
    ),
  },
  {
    path: '/settings',
    label: 'Настройки',
    caption: 'Параметры',
    icon: (
      <LineIcon>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1A1.7 1.7 0 0 0 10 3.2V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.4 1z" />
      </LineIcon>
    ),
  },
];

export function Sidebar() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const user = useAuthStore((s) => s.user);
  const organizations = useOrganizationStore((s) => s.organizations);
  const currentOrg = useOrganizationStore((s) => s.currentOrg);
  const setCurrentOrg = useOrganizationStore((s) => s.setCurrentOrg);
  const { logout } = useAuth();

  return (
    <aside className={clsx('sidebar-shell', sidebarOpen ? 'sidebar-shell--open' : 'sidebar-shell--compact')}>
      <div className="sidebar-shell__brand">
        <div className="brand-mark">S</div>
        <div className="sidebar-shell__brand-copy">
          <div className="sidebar-shell__eyebrow">Премиум-контур</div>
          <div className="sidebar-shell__title">StaffHub</div>
          <div className="sidebar-shell__subtitle">Светлое рабочее пространство</div>
        </div>
        <button className="sidebar-shell__toggle" onClick={toggleSidebar} aria-label="Переключить навигацию">
          {sidebarOpen ? '‹' : '›'}
        </button>
      </div>

      {organizations.length > 0 && (
        <div className="sidebar-shell__org-wrap">
          <div className="sidebar-shell__org">
            <div className="sidebar-shell__org-label">Рабочее пространство</div>
            <select
              className="lux-select"
              value={currentOrg?.id || ''}
              onChange={(e) => {
                const org = organizations.find((item) => item.id === e.target.value);
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
        </div>
      )}

      <nav className="sidebar-shell__nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => clsx('sidebar-shell__nav-item', isActive && 'is-active')}
          >
            <span className="sidebar-shell__nav-icon">{item.icon}</span>
            <span className="sidebar-shell__nav-label">
              <span className="sidebar-shell__nav-title">{item.label}</span>
              <span className="sidebar-shell__nav-caption">{item.caption}</span>
            </span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-shell__footer">
        <Avatar name={user ? `${user.firstName} ${user.lastName}` : 'SH'} size="md" online />
        <div className="sidebar-shell__footer-copy">
          <div className="sidebar-shell__status">{theme === 'dark' ? 'Тёмный режим' : 'Светлый режим'}</div>
          <div className="sidebar-shell__name">{user ? `${user.firstName} ${user.lastName}` : 'Участник'}</div>
        </div>
        <button className="lux-button-ghost sidebar-shell__logout" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          {theme === 'dark' ? 'Светлая' : 'Тёмная'}
        </button>
        <button className="lux-button-secondary sidebar-shell__logout" onClick={logout}>
          Выйти
        </button>
      </div>
    </aside>
  );
}
