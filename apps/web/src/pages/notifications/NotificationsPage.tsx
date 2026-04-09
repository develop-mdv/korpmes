import { useCallback, useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import * as notificationsApi from '@/api/notifications.api';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

type NotificationItem = notificationsApi.NotificationItem;

const typeLabels: Record<string, string> = {
  message: 'Сообщение',
  mention: 'Упоминание',
  task: 'Задача',
  call: 'Звонок',
  system: 'Система',
};

export function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await notificationsApi.listNotifications();
      setItems(response.items);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleMarkRead = useCallback(async (id: string) => {
    await notificationsApi.markAsRead(id);
    setItems((previous) => previous.map((item) => (item.id === id ? { ...item, isRead: true } : item)));
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    setMarkingAll(true);
    try {
      await notificationsApi.markAllAsRead();
      setItems((previous) => previous.map((item) => ({ ...item, isRead: true })));
    } finally {
      setMarkingAll(false);
    }
  }, []);

  const unreadCount = items.filter((item) => !item.isRead).length;

  return (
    <div className="page-shell">
      <div className="page-shell__inner">
        <section className="lux-panel page-hero">
          <div className="page-hero__copy">
            <div className="page-hero__kicker">Сигналы</div>
            <h1 className="page-hero__title">Все важные события в одном аккуратном потоке.</h1>
            <p className="page-hero__description">
              Следите за сообщениями, задачами, звонками и системными изменениями без лишнего визуального шума.
            </p>
            <div className="page-hero__meta">
              <span className="lux-pill">{unreadCount} непрочитанных</span>
              <span className="lux-pill">{items.length} всего</span>
            </div>
          </div>
          {unreadCount > 0 && (
            <div className="page-hero__actions">
              <button className="lux-button-secondary" onClick={handleMarkAllRead} disabled={markingAll}>
                {markingAll ? 'Отмечаем...' : 'Прочитать всё'}
              </button>
            </div>
          )}
        </section>

        {loading ? (
          <section className="lux-panel" style={{ padding: 28 }}>
            <LoadingSpinner />
          </section>
        ) : items.length === 0 ? (
          <section className="lux-panel" style={{ minHeight: 360 }}>
            <EmptyState title="Пока пусто" description="Новые события появятся здесь сразу после активности в системе." />
          </section>
        ) : (
          <section className="collection-list stagger-in">
            {items.map((item) => (
              <button
                key={item.id}
                className="list-card"
                style={item.isRead ? undefined : { borderColor: 'var(--color-border-strong)', background: 'var(--color-primary-faint)' }}
                onClick={() => !item.isRead && handleMarkRead(item.id)}
              >
                <div className="brand-mark" style={{ width: 44, height: 44, fontSize: 20 }}>
                  {typeLabels[item.type]?.charAt(0) || 'С'}
                </div>
                <div className="list-card__body">
                  <div className="list-card__title">{item.title}</div>
                  {item.body && <div className="list-card__subtitle" style={{ marginTop: 6 }}>{item.body}</div>}
                </div>
                <div className="list-card__actions">
                  <span className="lux-pill">{typeLabels[item.type] || item.type}</span>
                  <span className="list-card__subtitle">
                    {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: ru })}
                  </span>
                </div>
              </button>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
