import { CSSProperties, useEffect, useRef, useState } from 'react';
import { MAX_VIDEO_NOTE_DURATION_MS, VIDEO_NOTE_DIMENSION } from '@corp/shared-constants';
import { useVideoNoteRecorder, type VideoNoteRecording } from '@/hooks/useVideoNoteRecorder';

interface VideoNoteRecorderOverlayProps {
  open: boolean;
  onClose: () => void;
  onRecorded: (rec: VideoNoteRecording) => void;
}

const RING_PADDING = 12;

const styles: Record<string, CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    background: 'rgba(0,0,0,0.92)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  close: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(255,255,255,0.12)',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 18,
  },
  circleWrap: {
    position: 'relative',
    width: VIDEO_NOTE_DIMENSION + RING_PADDING * 2,
    height: VIDEO_NOTE_DIMENSION + RING_PADDING * 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoCircle: {
    width: VIDEO_NOTE_DIMENSION,
    height: VIDEO_NOTE_DIMENSION,
    borderRadius: '50%',
    objectFit: 'cover',
    background: '#000',
    cursor: 'pointer',
  },
  previewBadge: {
    position: 'absolute',
    bottom: 18,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(0,0,0,0.55)',
    color: '#fff',
    fontSize: 11,
    padding: '3px 10px',
    borderRadius: 12,
    pointerEvents: 'none',
  },
  hint: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
    paddingInline: 24,
  },
  elapsed: {
    color: '#fff',
    fontSize: 16,
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 600,
  },
  recordBtn: {
    width: 76,
    height: 76,
    borderRadius: '50%',
    border: '4px solid rgba(255,255,255,0.6)',
    background: '#dc3545',
    cursor: 'pointer',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopBtn: {
    width: 76,
    height: 76,
    borderRadius: '50%',
    border: '4px solid rgba(255,255,255,0.85)',
    background: '#dc3545',
    cursor: 'pointer',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopSquare: {
    width: 26,
    height: 26,
    borderRadius: 4,
    background: '#fff',
  },
  innerCircle: {
    width: 26,
    height: 26,
    borderRadius: '50%',
    background: '#fff',
  },
  progressRing: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
  },
  actions: {
    display: 'flex',
    gap: 16,
  },
  actionBtn: {
    minWidth: 140,
    padding: '12px 20px',
    borderRadius: 24,
    border: '1px solid rgba(255,255,255,0.25)',
    background: 'rgba(255,255,255,0.08)',
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
  sendBtn: {
    background: 'var(--color-primary, #9f7a3d)',
    borderColor: 'transparent',
  },
};

function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function VideoNoteRecorderOverlay({
  open,
  onClose,
  onRecorded,
}: VideoNoteRecorderOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const recorder = useVideoNoteRecorder();

  const showPreview = !!recorder.recording;
  const isRecording = recorder.state === 'recording';

  // Build a blob URL whenever a recording becomes available.
  useEffect(() => {
    if (!recorder.recording) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(recorder.recording.blob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [recorder.recording]);

  // Acquire the camera as soon as the overlay opens. Tear it all down on close.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    void recorder.acquireStream(videoRef.current).catch(() => undefined);
    return () => {
      alive = false;
      recorder.closeAndDispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Bind the single <video> element either to the live camera stream OR to the
  // recorded blob URL, based on which mode we are in. This avoids any DOM
  // mount/unmount races between two separate <video> elements.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !open) return;

    if (showPreview && previewUrl) {
      v.srcObject = null;
      v.src = previewUrl;
      v.muted = false;
      v.loop = true;
      v.style.transform = 'scaleX(-1)'; // keep mirrored to match what the user saw
      v.play().catch((err) => console.warn('[video-note] preview play failed', err));
    } else {
      v.removeAttribute('src');
      v.muted = true;
      v.loop = false;
      v.style.transform = 'scaleX(-1)';
      const stream = recorder.streamRef.current;
      if (stream && v.srcObject !== stream) {
        v.srcObject = stream;
        v.play().catch(() => undefined);
      } else if (!stream) {
        // Camera not ready yet — kick off acquisition so preview comes alive.
        void recorder.acquireStream(v).catch(() => undefined);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, showPreview, previewUrl, recorder.state]);

  if (!open) return null;

  const handleStartStop = () => {
    if (recorder.state === 'idle') {
      void recorder.start(videoRef.current);
    } else if (recorder.state === 'recording') {
      recorder.stop();
    }
  };

  const handleRetake = () => {
    recorder.discardRecording();
  };

  const handleSend = () => {
    if (!recorder.recording) return;
    const rec = recorder.recording;
    onRecorded(rec);
    recorder.discardRecording();
    onClose();
  };

  const handleClose = () => {
    recorder.closeAndDispose();
    onClose();
  };

  const ringSize = VIDEO_NOTE_DIMENSION + RING_PADDING * 2;
  const radius = (ringSize - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(1, recorder.elapsedMs / MAX_VIDEO_NOTE_DURATION_MS);
  const dashOffset = circumference * (1 - progress);

  return (
    <div style={styles.backdrop} role="dialog" aria-modal="true">
      <button style={styles.close} onClick={handleClose} title="Закрыть">
        ✕
      </button>

      <div style={styles.circleWrap}>
        <video
          ref={videoRef}
          style={styles.videoCircle}
          playsInline
          autoPlay
          onClick={() => {
            const v = videoRef.current;
            if (!v || !showPreview) return;
            if (v.paused) v.play().catch(() => undefined);
            else v.pause();
          }}
        />
        {showPreview && <div style={styles.previewBadge}>Превью записи</div>}
        {isRecording && (
          <svg
            style={styles.progressRing}
            width={ringSize}
            height={ringSize}
            viewBox={`0 0 ${ringSize} ${ringSize}`}
          >
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="none"
              stroke="#dc3545"
              strokeWidth={4}
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>

      {recorder.error ? (
        <div style={{ ...styles.hint, color: '#ff6b6b' }}>
          {recorder.error.message || 'Не удалось получить доступ к камере'}
        </div>
      ) : showPreview && recorder.recording ? (
        <div style={styles.elapsed}>{formatElapsed(recorder.recording.durationMs)}</div>
      ) : isRecording ? (
        <div style={styles.elapsed}>{formatElapsed(recorder.elapsedMs)}</div>
      ) : (
        <div style={styles.hint}>Нажмите кнопку, чтобы начать запись (до 60 сек)</div>
      )}

      {showPreview ? (
        <div style={styles.actions}>
          <button style={styles.actionBtn} onClick={handleRetake}>
            Перезаписать
          </button>
          <button style={{ ...styles.actionBtn, ...styles.sendBtn }} onClick={handleSend}>
            Отправить
          </button>
        </div>
      ) : (
        <button
          style={isRecording ? styles.stopBtn : styles.recordBtn}
          onClick={handleStartStop}
          disabled={!!recorder.error}
          title={isRecording ? 'Остановить запись' : 'Начать запись'}
        >
          {isRecording ? <span style={styles.stopSquare} /> : <span style={styles.innerCircle} />}
        </button>
      )}
    </div>
  );
}
