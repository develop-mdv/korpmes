import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import * as notificationsApi from '@/api/notifications.api';

type NotificationItem = notificationsApi.NotificationItem;

const TYPE_META: Record<string, { mark: string; label: string }> = {
  message: { mark: 'MSG', label: 'Сообщение' },
  mention: { mark: '@', label: 'Упоминание' },
  task: { mark: 'TASK', label: 'Задача' },
  call: { mark: 'CALL', label: 'Звонок' },
  system: { mark: 'SYS', label: 'Система' },
};

function NotificationRow({
  item,
  onMarkRead,
}: {
  item: NotificationItem;
  onMarkRead: (id: string) => void;
}) {
  const type = TYPE_META[item.type] ?? TYPE_META.system;

  return (
    <button
      className="list-card"
      style={{
        ...styles.row,
        ...(item.isRead ? {} : styles.rowUnread),
      }}
      onClick={() => !item.isRead && onMarkRead(item.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && !item.isRead) onMarkRead(item.id);
      }}
      type="button"
    >
      <span style={styles.typeMark}>{type.mark}</span>
      <span className="list-card__body">
        <span style={styles.rowTop}>
          <span className="list-card__title">{item.title}</span>
          <span className="lux-pill">{type.label}</span>
        </span>
        {item.body && <span className="list-card__subtitle" style={styles.bodyText}>{item.body}</span>}
        <span className="list-card__meta">
          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: ru })}
        </span>
      </span>
      {!item.isRead && <span style={styles.unreadDot} aria-label="Не прочитано" />}
    </button>
  );
}

export function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await notificationsApi.listNotifications();
      setItems(res.items);
      setTotal(res.total);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Не удалось загрузить уведомления');
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleMarkRead = useCallback(async (id: string) => {
    await notificationsApi.markAsRead(id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
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
    <div className="page-shell">
      <div className="page-shell__inner">
        <section className="lux-panel page-hero">
          <div className="page-hero__copy">
            <div className="page-hero__kicker">Сигналы</div>
            <h1 className="page-hero__title">Уведомления под контролем.</h1>
            <p className="page-hero__description">
              Только важные обновления: сообщения, задачи, звонки и системные события, чтобы ничего не потерялось в рабочем темпе.
            </p>
            <div className="page-hero__meta">
              <span className="lux-pill">Всего: {total}</span>
              <span className="lux-pill">Новых: {unreadCount}</span>
            </div>
          </div>
          {unreadCount > 0 && (
            <div className="page-hero__actions">
              <button
                className="lux-button-secondary"
                onClick={handleMarkAllRead}
                disabled={markingAll}
                type="button"
              >
                {markingAll ? 'Отмечаем...' : `Прочитать все (${unreadCount})`}
              </button>
            </div>
          )}
        </section>

        {error && <div className="lux-alert">{error}</div>}

        <section className="lux-panel" style={{ padding: 16 }}>
          {loading ? (
            <div style={styles.centered}>
              <LoadingSpinner />
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              title="Пока уведомлений нет"
              description="Когда появится что-то важное, мы покажем это здесь спокойной аккуратной лентой."
            />
          ) : (
            <div className="collection-list">
              {items.map((item) => (
                <NotificationRow key={item.id} item={item} onMarkRead={handleMarkRead} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

const styles = {
  centered: {
    display: 'flex',
    justifyContent: 'center',
    padding: 32,
  },
  row: {
    alignItems: 'flex-start',
    gap: 14,
    cursor: 'pointer',
  },
  rowUnread: {
    borderColor: 'rgba(212, 177, 106, 0.4)',
    background:
      'linear-gradient(135deg, rgba(212, 177, 106, 0.13), rgba(255, 255, 255, 0.66))',
  },
  typeMark: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    flex: '0 0 48px',
    borderRadius: 16,
    border: '1px solid rgba(212, 177, 106, 0.28)',
    background: 'linear-gradient(135deg, rgba(212, 177, 106, 0.22), rgba(255, 255, 255, 0.72))',
    color: '#7a5a16',
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: '0.08em',
  },
  rowTop: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  bodyText: {
    display: 'block',
    marginTop: 6,
  },
  unreadDot: {
    width: 10,
    height: 10,
    marginTop: 10,
    borderRadius: '50%',
    background: 'var(--color-primary)',
    boxShadow: '0 0 0 6px rgba(212, 177, 106, 0.13)',
  },
} satisfies Record<string, CSSProperties>;
