import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import * as callsApi from '@/api/calls.api';
import { Avatar } from '@/components/common/Avatar';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useAuthStore } from '@/stores/auth.store';

type CallData = callsApi.CallData;

function formatDuration(startedAt: string | null, endedAt: string | null) {
  if (!startedAt || !endedAt) return 'Без длительности';
  const seconds = Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000);
  if (seconds < 60) return `${seconds} сек`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

export function CallsPage() {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const [calls, setCalls] = useState<CallData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    callsApi
      .getAllCallHistory()
      .then(setCalls)
      .catch(() => setError('Не удалось загрузить историю звонков'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-shell">
      <div className="page-shell__inner">
        <section className="lux-panel page-hero">
          <div className="page-hero__copy">
            <div className="page-hero__kicker">Звонки</div>
            <h1 className="page-hero__title">История аудио и видео без лишней перегрузки.</h1>
            <p className="page-hero__description">
              Просматривайте последние созвоны в одном чистом и светлом списке.
            </p>
          </div>
        </section>

        {loading && (
          <section className="lux-panel" style={{ padding: 28 }}>
            <LoadingSpinner />
          </section>
        )}

        {error && <div className="lux-alert">{error}</div>}

        {!loading && !error && calls.length === 0 && (
          <section className="lux-panel" style={{ minHeight: 340 }}>
            <EmptyState title="История пока пуста" description="Когда появятся первые звонки, они будут показаны здесь." />
          </section>
        )}

        {!loading && !error && calls.length > 0 && (
          <section className="collection-list stagger-in">
            {calls.map((call) => {
              const isOutgoing = call.initiatedBy === currentUserId;
              const missed = call.status === 'REJECTED' || (call.status === 'MISSED' && !isOutgoing);

              return (
                <article key={call.id} className="list-card">
                  <Avatar name={call.type === 'VIDEO' ? 'Видео' : 'Аудио'} size="md" />
                  <div className="list-card__body">
                    <div className="list-card__title">
                      {isOutgoing ? 'Исходящий' : missed ? 'Пропущенный' : 'Входящий'} {call.type === 'VIDEO' ? 'видеозвонок' : 'аудиозвонок'}
                    </div>
                    <div className="list-card__meta">
                      <span>{formatDuration(call.startedAt, call.endedAt)}</span>
                      <span>{formatDistanceToNow(new Date(call.createdAt), { addSuffix: true, locale: ru })}</span>
                    </div>
                  </div>
                  <div className="list-card__actions">
                    <span className="lux-pill">{missed ? 'пропущен' : call.status.toLowerCase()}</span>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </div>
  );
}
