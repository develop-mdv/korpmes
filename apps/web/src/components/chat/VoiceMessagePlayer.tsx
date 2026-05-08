import { CSSProperties, useEffect, useRef, useState } from 'react';
import { useFileStore } from '@/stores/file.store';
import { VOICE_WAVEFORM_BARS } from '@corp/shared-constants';

interface VoiceMessagePlayerProps {
  fileId: string;
  durationMs?: number;
  waveform?: number[];
  isOwn: boolean;
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    minWidth: 220,
    maxWidth: 'min(320px, 70vw)',
    padding: 4,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(255,255,255,0.18)',
    color: 'inherit',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  middle: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 },
  bars: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    height: 22,
    cursor: 'pointer',
  },
  duration: {
    fontSize: 11,
    opacity: 0.75,
    fontVariantNumeric: 'tabular-nums',
  },
};

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function fallbackWaveform(): number[] {
  const arr = new Array(VOICE_WAVEFORM_BARS).fill(0);
  for (let i = 0; i < VOICE_WAVEFORM_BARS; i++) {
    arr[i] = 25 + Math.round(45 * Math.abs(Math.sin(i * 1.7)));
  }
  return arr;
}

export function VoiceMessagePlayer({
  fileId,
  durationMs,
  waveform,
  isOwn,
}: VoiceMessagePlayerProps) {
  const fetchFile = useFileStore((s) => s.fetchFile);
  const file = useFileStore((s) => s.filesById[fileId]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);

  useEffect(() => {
    if (!file) void fetchFile(fileId);
  }, [fileId, file, fetchFile]);

  useEffect(() => {
    if (!file?.signedUrl) return;
    const audio = new Audio(file.signedUrl);
    audioRef.current = audio;
    const onTime = () => setCurrentMs(audio.currentTime * 1000);
    const onEnd = () => {
      setIsPlaying(false);
      setCurrentMs(0);
    };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnd);
      audioRef.current = null;
    };
  }, [file?.signedUrl]);

  const totalMs = durationMs || file?.durationMs || 0;
  const bars = waveform && waveform.length > 0 ? waveform : fallbackWaveform();
  const progress = totalMs > 0 ? Math.min(1, currentMs / totalMs) : 0;

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => undefined);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || totalMs <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = (totalMs * ratio) / 1000;
    setCurrentMs(totalMs * ratio);
  };

  return (
    <div style={styles.wrap}>
      <button style={styles.playBtn} onClick={togglePlay} title={isPlaying ? 'Пауза' : 'Воспроизвести'}>
        {isPlaying ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
      <div style={styles.middle}>
        <div style={styles.bars} onClick={handleSeek}>
          {bars.map((v, i) => {
            const filled = i / bars.length < progress;
            const h = Math.max(3, Math.round((v / 100) * 22));
            return (
              <div
                key={i}
                style={{
                  width: 3,
                  height: h,
                  borderRadius: 2,
                  background: filled ? (isOwn ? '#ffffff' : 'var(--color-primary)') : 'rgba(255,255,255,0.35)',
                  transition: 'background 0.1s',
                }}
              />
            );
          })}
        </div>
        <div style={styles.duration}>
          {formatDuration(currentMs)} / {formatDuration(totalMs)}
        </div>
      </div>
    </div>
  );
}
