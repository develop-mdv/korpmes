import React, { useEffect, useState, useCallback } from 'react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import * as notificationsApi from '@/api/notifications.api';
import { formatDistanceToNow } from 'date-fns';

type NotificationItem = notificationsApi.NotificationItem;

const TYPE_ICONS: Record<string, string> = {
  message: '💬',
  mention: '@',
  task: '✅',
  call: '📞',
  system: 'ℹ️',
};

function NotificationRow({
  item,
  onMarkRead,
}: {
  item: NotificationItem;
  onMarkRead: (id: string) => void;
}) {
  return (
    <div
      style={{
        ...styles.row,
        ...(item.isRead ? {} : styles.rowUnread),
      }}
      onClick={() => !item.isRead && onMarkRead(item.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && !item.isRead && onMarkRead(item.id)}
    >
      <div style={styles.icon}>{TYPE_ICONS[item.type] ?? 'ℹ️'}</div>
      <div style={styles.body}>
        <div style={styles.rowTitle}>{item.title}</div>
        {item.body && <div style={styles.rowBody}>{item.body}</div>}
      </div>
      <div style={styles.meta}>
        <span style={styles.time}>
          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
        </span>
        {!item.isRead && <span style={styles.dot} />}
      </div>
    </div>
  );
}

export function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationsApi.listNotifications();
      setItems(res.items);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleMarkRead = useCallback(async (id: string) => {
    await notificationsApi.markAsRead(id);
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    setMarkingAll(true);
    try {
      await notificationsApi.markAllAsRead();
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } finally {
      setMarkingAll(false);
    }
  }, []);

  const unreadCount = items.filter((n) => !n.isRead).length;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Notifications</h1>
        {unreadCount > 0 && (
          <button
            style={styles.markAllBtn}
            onClick={handleMarkAllRead}
            disabled={markingAll}
          >
            {markingAll ? 'Marking…' : `Mark all read (${unreadCount})`}
          </button>
        )}
      </div>

      {loading && (
        <div style={styles.centered}>
          <LoadingSpinner />
        </div>
      )}

      {!loading && items.length === 0 && (
        <EmptyState title="No notifications" description="You're all caught up!" />
      )}

      {!loading && items.length > 0 && (
        <div style={styles.list}>
          {items.map((item) => (
            <NotificationRow key={item.id} item={item} onMarkRead={handleMarkRead} />
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: 24, maxWidth: 720, margin: '0 auto' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--color-text)' },
  markAllBtn: {
    padding: '7px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--color-primary)',
  },
  centered: { display: 'flex', justifyContent: 'center', paddingTop: 40 },
  list: { display: 'flex', flexDirection: 'column', gap: 4 },
  row: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: '12px 16px',
    borderRadius: 8,
    border: '1px solid var(--color-border)',
    background: 'var(--color-surface)',
    cursor: 'pointer',
  },
  rowUnread: {
    borderColor: 'var(--color-primary)',
    background: 'var(--color-primary-faint, rgba(79,70,229,0.04))',
  },
  icon: {
    fontSize: 18,
    minWidth: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 1,
  },
  body: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 14, fontWeight: 600, color: 'var(--color-text)' },
  rowBody: { fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 },
  meta: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, paddingTop: 1 },
  time: { fontSize: 11, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: 'var(--color-primary)',
  },
};
