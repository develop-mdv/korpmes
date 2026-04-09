import { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { useNotificationStore } from '@/stores/notification.store';
import { Avatar } from '@/components/common/Avatar';
import { Badge } from '@/components/common/Badge';

interface TopBarProps {
  title: string;
}

const barStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  padding: '12px 24px',
  backgroundColor: 'var(--color-surface)',
  borderBottom: '1px solid var(--color-border)',
  height: 56,
  flexShrink: 0,
};

const titleStyle: CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  color: 'var(--color-text)',
};

const searchStyle: CSSProperties = {
  flex: 1,
  maxWidth: 400,
  marginLeft: 'auto',
  padding: '8px 14px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-full)',
  backgroundColor: 'var(--color-bg-tertiary)',
  color: 'var(--color-text)',
  fontSize: 13,
  outline: 'none',
};

const notifBtnStyle: CSSProperties = {
  position: 'relative',
  background: 'none',
  border: 'none',
  fontSize: 20,
  cursor: 'pointer',
  color: 'var(--color-text-secondary)',
  padding: 4,
};

export function TopBar({ title }: TopBarProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  return (
    <div style={barStyle}>
      <h1 style={titleStyle}>{title}</h1>
      <input
        style={searchStyle}
        type="text"
        placeholder="Поиск..."
        onFocus={() => navigate('/search')}
        readOnly
      />
      <button style={notifBtnStyle} aria-label="Уведомления">
        <span>&#x1F514;</span>
        {unreadCount > 0 && (
          <span style={{ position: 'absolute', top: -4, right: -4 }}>
            <Badge count={unreadCount} />
          </span>
        )}
      </button>
      <Avatar name={user ? `${user.firstName} ${user.lastName}` : 'U'} size="sm" />
    </div>
  );
}
