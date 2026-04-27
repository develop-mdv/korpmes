import React, { useEffect, useState } from 'react';
import { EmptyState } from '@/components/common/EmptyState';
import { Avatar } from '@/components/common/Avatar';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useAuthStore } from '@/stores/auth.store';
import * as callsApi from '@/api/calls.api';
import { formatDistanceToNow } from 'date-fns';

type CallData = callsApi.CallData;

function formatDuration(startedAt: string | null, endedAt: string | null): string {
  if (!startedAt || !endedAt) return '';
  const seconds = Math.round(
    (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000,
  );
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function CallStatusIcon({ status, isOutgoing }: { status: string; isOutgoing: boolean }) {
  const color =
    status === 'ENDED' ? 'var(--color-success)'
    : status === 'REJECTED' || status === 'MISSED' ? 'var(--color-error)'
    : 'var(--color-text-secondary)';

  const arrow = isOutgoing ? '↗' : '↙';
  return <span style={{ color, fontSize: 18, marginRight: 8 }}>{arrow}</span>;
}

export function CallsPage() {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [calls, setCalls] = useState<CallData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    callsApi
      .getAllCallHistory()
      .then(setCalls)
      .catch(() => setError('Failed to load call history'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Calls</h1>

      {loading && (
        <div style={styles.centered}>
          <LoadingSpinner />
        </div>
      )}

      {error && <p style={styles.error}>{error}</p>}

      {!loading && !error && calls.length === 0 && (
        <EmptyState
          title="No call history"
          description="Your audio and video calls will appear here"
        />
      )}

      {!loading && !error && calls.length > 0 && (
        <div style={styles.list}>
          {calls.map((call) => {
            const isOutgoing = call.initiatedBy === currentUserId;
            const duration = formatDuration(call.startedAt, call.endedAt);
            const missed =
              call.status === 'REJECTED' ||
              (call.status === 'MISSED' && !isOutgoing);

            return (
              <div key={call.id} style={styles.item}>
                <Avatar name="?" size="md" />
                <div style={styles.info}>
                  <div style={styles.row}>
                    <CallStatusIcon status={call.status} isOutgoing={isOutgoing} />
                    <span style={{ ...styles.label, color: missed ? 'var(--color-error)' : 'var(--color-text)' }}>
                      {isOutgoing ? 'Outgoing' : missed ? 'Missed' : 'Incoming'}{' '}
                      {call.type === 'VIDEO' ? 'video' : 'audio'} call
                    </span>
                  </div>
                  <div style={styles.meta}>
                    {duration && <span style={styles.duration}>{duration}</span>}
                    <span style={styles.time}>
                      {formatDistanceToNow(new Date(call.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                <div style={styles.type}>
                  {call.type === 'VIDEO' ? '🎥' : '📞'}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: 'clamp(12px, 4vw, 24px)', maxWidth: 720, margin: '0 auto' },
  title: { fontSize: 24, fontWeight: 700, marginBottom: 24, color: 'var(--color-text)' },
  centered: { display: 'flex', justifyContent: 'center', paddingTop: 40 },
  error: { color: 'var(--color-error)', fontSize: 14 },
  list: { display: 'flex', flexDirection: 'column', gap: 4 },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    borderRadius: 8,
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
  },
  info: { flex: 1, minWidth: 0 },
  row: { display: 'flex', alignItems: 'center' },
  label: { fontSize: 14, fontWeight: 500 },
  meta: { display: 'flex', gap: 8, marginTop: 2 },
  duration: { fontSize: 12, color: 'var(--color-text-secondary)' },
  time: { fontSize: 12, color: 'var(--color-text-secondary)' },
  type: { fontSize: 18 },
};
