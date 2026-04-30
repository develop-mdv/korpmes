import { useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useAuthStore } from '@/stores/auth.store';
import * as callsApi from '@/api/calls.api';

type CallData = callsApi.CallData;

function formatDuration(startedAt: string | null, endedAt: string | null): string {
  if (!startedAt || !endedAt) {
    return '';
  }

  const seconds = Math.max(0, Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000));
  if (seconds < 60) {
    return `${seconds} сек`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function getCallTone(call: CallData, isOutgoing: boolean) {
  const missed = call.status === 'REJECTED' || (call.status === 'MISSED' && !isOutgoing);

  if (missed) {
    return {
      label: call.type === 'VIDEO' ? 'Пропущенный видеозвонок' : 'Пропущенный аудиозвонок',
      color: 'var(--color-error)',
      arrow: '↙',
    };
  }

  return {
    label: `${isOutgoing ? 'Исходящий' : 'Входящий'} ${call.type === 'VIDEO' ? 'видеозвонок' : 'аудиозвонок'}`,
    color: isOutgoing ? 'var(--color-info)' : 'var(--color-success)',
    arrow: isOutgoing ? '↗' : '↙',
  };
}

function getStatusLabel(status: CallData['status']) {
  const labels: Record<CallData['status'], string> = {
    RINGING: 'идёт вызов',
    ACTIVE: 'активен',
    ENDED: 'завершён',
    MISSED: 'пропущен',
    REJECTED: 'отклонён',
  };

  return labels[status];
}

function CallGlyph({ type }: { type: CallData['type'] }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {type === 'VIDEO' ? (
        <>
          <path d="M23 7l-7 5 7 5V7z" />
          <rect x="1" y="5" width="15" height="14" rx="2" />
        </>
      ) : (
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
      )}
    </svg>
  );
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
      .catch(() => setError('Не удалось загрузить историю звонков.'))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const video = calls.filter((call) => call.type === 'VIDEO').length;
    const missed = calls.filter((call) => call.status === 'MISSED' || call.status === 'REJECTED').length;
    return { total: calls.length, audio: calls.length - video, video, missed };
  }, [calls]);

  return (
    <div className="page-shell">
      <div className="page-shell__inner">
        <section className="lux-panel page-hero">
          <div className="page-hero__copy">
            <div className="page-hero__kicker">Звонки</div>
            <h1 className="page-hero__title">История связи без лишнего шума.</h1>
            <p className="page-hero__description">
              Аудио и видео события собраны в спокойную ленту: видно направление, тип звонка, длительность и давность
              контакта.
            </p>
            <div className="page-hero__meta">
              <span className="lux-pill">{stats.total} всего</span>
              <span className="lux-pill">{stats.audio} аудио</span>
              <span className="lux-pill">{stats.video} видео</span>
              <span className="lux-pill">{stats.missed} пропущено</span>
            </div>
          </div>
        </section>

        {loading && (
          <section className="lux-panel" style={styles.centered}>
            <LoadingSpinner />
          </section>
        )}

        {error && (
          <section className="lux-panel" style={styles.noticeError}>
            {error}
          </section>
        )}

        {!loading && !error && calls.length === 0 && (
          <section className="lux-panel" style={{ minHeight: 360 }}>
            <EmptyState title="История пока пуста" description="Аудио и видеозвонки появятся здесь после первого разговора." />
          </section>
        )}

        {!loading && !error && calls.length > 0 && (
          <section className="collection-list">
            {calls.map((call) => {
              const isOutgoing = call.initiatedBy === currentUserId;
              const duration = formatDuration(call.startedAt, call.endedAt);
              const tone = getCallTone(call, isOutgoing);

              return (
                <article key={call.id} className="lux-panel list-card" style={styles.callRow}>
                  <div style={{ ...styles.directionBadge, color: tone.color }}>
                    <span aria-hidden="true">{tone.arrow}</span>
                  </div>

                  <div className="list-card__body">
                    <div className="list-card__title">{tone.label}</div>
                    <div className="list-card__meta">
                      {duration && <span>{duration}</span>}
                      <span>{formatDistanceToNow(new Date(call.createdAt), { addSuffix: true, locale: ru })}</span>
                      <span>{getStatusLabel(call.status)}</span>
                    </div>
                  </div>

                  <div style={styles.typeBadge} title={call.type === 'VIDEO' ? 'Видео' : 'Аудио'}>
                    <CallGlyph type={call.type} />
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

const styles: Record<string, React.CSSProperties> = {
  centered: {
    minHeight: 320,
    display: 'grid',
    placeItems: 'center',
  },
  noticeError: {
    padding: 18,
    color: 'var(--color-error)',
  },
  callRow: {
    alignItems: 'center',
    borderRadius: 18,
    padding: '14px 16px',
  },
  directionBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    display: 'grid',
    placeItems: 'center',
    background: 'var(--color-surface-soft)',
    border: '1px solid var(--color-border)',
    fontSize: 20,
    fontWeight: 800,
    flexShrink: 0,
  },
  typeBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    display: 'grid',
    placeItems: 'center',
    color: 'var(--color-primary-dark)',
    background: 'var(--color-primary-faint)',
    border: '1px solid var(--color-border)',
    flexShrink: 0,
  },
};
