import { CSSProperties, useEffect, useRef, useState } from 'react';
import { useFileStore } from '@/stores/file.store';
import { VIDEO_NOTE_DIMENSION } from '@corp/shared-constants';

interface VideoNotePlayerProps {
  fileId: string;
  durationMs?: number;
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    position: 'relative',
    width: VIDEO_NOTE_DIMENSION,
    height: VIDEO_NOTE_DIMENSION,
    borderRadius: '50%',
    overflow: 'hidden',
    background: '#000',
    cursor: 'pointer',
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: 'scaleX(-1)',
  },
  badge: {
    position: 'absolute',
    bottom: 12,
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '2px 8px',
    borderRadius: 12,
    background: 'rgba(0,0,0,0.6)',
    color: '#fff',
    fontSize: 11,
    fontVariantNumeric: 'tabular-nums',
    pointerEvents: 'none',
  },
};

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function VideoNotePlayer({ fileId, durationMs }: VideoNotePlayerProps) {
  const fetchFile = useFileStore((s) => s.fetchFile);
  const file = useFileStore((s) => s.filesById[fileId]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);

  useEffect(() => {
    if (!file) void fetchFile(fileId);
  }, [fileId, file, fetchFile]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setCurrentMs(v.currentTime * 1000);
    const onEnd = () => {
      setIsPlaying(false);
      setCurrentMs(0);
      v.currentTime = 0;
    };
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('ended', onEnd);
    return () => {
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('ended', onEnd);
    };
  }, [file?.signedUrl]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) {
      v.pause();
      setIsPlaying(false);
    } else {
      v.play().then(() => setIsPlaying(true)).catch(() => undefined);
    }
  };

  const totalMs = durationMs || file?.durationMs || 0;
  const remainingMs = isPlaying ? Math.max(0, totalMs - currentMs) : totalMs;

  if (!file?.signedUrl) {
    return (
      <div
        style={{
          ...styles.wrap,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: 12,
          opacity: 0.6,
        }}
      >
        Загружается…
      </div>
    );
  }

  return (
    <div style={styles.wrap} onClick={togglePlay}>
      <video
        ref={videoRef}
        src={file.signedUrl}
        style={styles.video}
        playsInline
        preload="metadata"
      />
      {totalMs > 0 && <div style={styles.badge}>{formatDuration(remainingMs)}</div>}
    </div>
  );
}
