import { CSSProperties } from 'react';
import type { VoiceRecorderState } from '@/hooks/useVoiceRecorder';

interface RecordingBarProps {
  state: VoiceRecorderState;
  elapsedMs: number;
  amplitude: number;
  onCancel: () => void;
  onSend: () => void;
  onLock?: () => void;
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const styles: Record<string, CSSProperties> = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '8px 18px',
    minHeight: 56,
    background: 'var(--color-surface)',
    borderTop: '1px solid var(--color-border)',
  },
  cancelBtn: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(220, 53, 69, 0.12)',
    color: '#dc3545',
    cursor: 'pointer',
    fontSize: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: '50%',
    background: '#dc3545',
    flexShrink: 0,
  },
  elapsed: {
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 600,
    fontSize: 14,
    color: 'var(--color-text-primary)',
    minWidth: 48,
    flexShrink: 0,
  },
  ampBar: {
    flex: 1,
    height: 24,
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    overflow: 'hidden',
    minWidth: 0,
  },
  hint: {
    flex: 1,
    color: 'var(--color-text-secondary)',
    fontSize: 13,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  lockBtn: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(0,0,0,0.06)',
    color: 'var(--color-text-secondary)',
    cursor: 'pointer',
    fontSize: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    border: 'none',
    background: 'var(--color-primary)',
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
};

export function RecordingBar({
  state,
  elapsedMs,
  amplitude,
  onCancel,
  onSend,
  onLock,
}: RecordingBarProps) {
  const isLocked = state === 'locked';
  const bars = 24;
  const seed = (i: number) => 0.3 + 0.7 * Math.abs(Math.sin(i * 1.7 + elapsedMs / 200));

  return (
    <div style={styles.bar}>
      <button style={styles.cancelBtn} onClick={onCancel} title="Отменить">
        ✕
      </button>
      <div style={styles.dot} />
      <div style={styles.elapsed}>{formatElapsed(elapsedMs)}</div>
      <div style={styles.ampBar}>
        {Array.from({ length: bars }).map((_, i) => {
          const h = Math.max(3, Math.round(amplitude * 22 * seed(i)));
          return (
            <div
              key={i}
              style={{
                width: 3,
                height: h,
                borderRadius: 2,
                background: 'var(--color-primary)',
                opacity: 0.7,
              }}
            />
          );
        })}
      </div>
      {!isLocked && onLock && (
        <button style={styles.lockBtn} onClick={onLock} title="Зафиксировать">
          🔒
        </button>
      )}
      {isLocked ? (
        <span style={styles.hint}>Запись зафиксирована</span>
      ) : (
        <span style={styles.hint}>Отпустите для отправки</span>
      )}
      <button style={styles.sendBtn} onClick={onSend} title="Отправить">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
        </svg>
      </button>
    </div>
  );
}
