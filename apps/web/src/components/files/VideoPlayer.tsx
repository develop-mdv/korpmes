import React, { CSSProperties, useEffect, useRef, useState } from 'react';

interface Props {
  src: string;
  poster?: string;
  autoPlay?: boolean;
}

const SKIP_SECONDS = 10;
const DOUBLE_TAP_MS = 280;
const LONG_PRESS_MS = 350;
const MOVE_THRESHOLD_PX = 10;

function formatTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) return '0:00';
  const total = Math.floor(s);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const mm = h > 0 ? m.toString().padStart(2, '0') : String(m);
  const ss = sec.toString().padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function VideoPlayer({ src, poster, autoPlay = false }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [speedActive, setSpeedActive] = useState(false);
  const [skipFlash, setSkipFlash] = useState<{ side: 'left' | 'right'; key: number } | null>(null);

  const lastTapRef = useRef<{ time: number; side: 'left' | 'right' } | null>(null);
  const singleTapTimerRef = useRef<number | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);
  const prevRateRef = useRef(1);
  const wasPlayingBeforeLongRef = useRef(false);
  const scrubbingRef = useRef(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTime = () => setCurrentTime(v.currentTime);
    const onDur = () => setDuration(Number.isFinite(v.duration) ? v.duration : 0);
    const onProg = () => {
      try {
        if (v.buffered.length > 0) setBufferedEnd(v.buffered.end(v.buffered.length - 1));
      } catch {
        /* noop */
      }
    };
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('loadedmetadata', onDur);
    v.addEventListener('durationchange', onDur);
    v.addEventListener('progress', onProg);
    return () => {
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('loadedmetadata', onDur);
      v.removeEventListener('durationchange', onDur);
      v.removeEventListener('progress', onProg);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (singleTapTimerRef.current !== null) window.clearTimeout(singleTapTimerRef.current);
      if (longPressTimerRef.current !== null) window.clearTimeout(longPressTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!skipFlash) return;
    const t = window.setTimeout(() => setSkipFlash(null), 520);
    return () => window.clearTimeout(t);
  }, [skipFlash]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => undefined);
    } else {
      v.pause();
    }
  };

  const skipBy = (deltaSec: number, side: 'left' | 'right') => {
    const v = videoRef.current;
    if (!v) return;
    const total = Number.isFinite(v.duration) ? v.duration : 0;
    const next = Math.max(0, Math.min(total || Number.MAX_SAFE_INTEGER, v.currentTime + deltaSec));
    v.currentTime = next;
    setSkipFlash({ side, key: Date.now() });
  };

  const cancelLongPressTimer = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const endLongPress = () => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = prevRateRef.current || 1;
    if (!wasPlayingBeforeLongRef.current && !v.paused) v.pause();
    setSpeedActive(false);
  };

  const handleGesturePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    pointerDownRef.current = { x: event.clientX, y: event.clientY };
    longPressTriggeredRef.current = false;
    longPressTimerRef.current = window.setTimeout(() => {
      const v = videoRef.current;
      if (!v) return;
      longPressTriggeredRef.current = true;
      wasPlayingBeforeLongRef.current = !v.paused;
      prevRateRef.current = v.playbackRate || 1;
      v.playbackRate = 2;
      if (v.paused) v.play().catch(() => undefined);
      setSpeedActive(true);
    }, LONG_PRESS_MS);
  };

  const handleGesturePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const down = pointerDownRef.current;
    if (!down) return;
    if (longPressTriggeredRef.current) return;
    const dx = event.clientX - down.x;
    const dy = event.clientY - down.y;
    if (Math.hypot(dx, dy) > MOVE_THRESHOLD_PX) {
      cancelLongPressTimer();
    }
  };

  const handleGesturePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    cancelLongPressTimer();
    const down = pointerDownRef.current;
    pointerDownRef.current = null;

    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      endLongPress();
      return;
    }

    if (!down) return;
    const dx = event.clientX - down.x;
    const dy = event.clientY - down.y;
    if (Math.hypot(dx, dy) > MOVE_THRESHOLD_PX) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const side: 'left' | 'right' = event.clientX - rect.left < rect.width / 2 ? 'left' : 'right';
    const now = Date.now();
    const prev = lastTapRef.current;

    if (prev && now - prev.time < DOUBLE_TAP_MS && prev.side === side) {
      if (singleTapTimerRef.current !== null) {
        window.clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      lastTapRef.current = null;
      skipBy(side === 'left' ? -SKIP_SECONDS : SKIP_SECONDS, side);
      return;
    }

    lastTapRef.current = { time: now, side };
    if (singleTapTimerRef.current !== null) window.clearTimeout(singleTapTimerRef.current);
    singleTapTimerRef.current = window.setTimeout(() => {
      togglePlay();
      lastTapRef.current = null;
      singleTapTimerRef.current = null;
    }, DOUBLE_TAP_MS);
  };

  const handleGesturePointerCancel = () => {
    cancelLongPressTimer();
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      endLongPress();
    }
    pointerDownRef.current = null;
  };

  const seekToClientX = (clientX: number) => {
    const bar = barRef.current;
    const v = videoRef.current;
    if (!bar || !v) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const total = Number.isFinite(v.duration) ? v.duration : 0;
    if (total > 0) v.currentTime = total * ratio;
  };

  const onBarPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    scrubbingRef.current = true;
    seekToClientX(event.clientX);
  };

  const onBarPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!scrubbingRef.current) return;
    seekToClientX(event.clientX);
  };

  const onBarPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    scrubbingRef.current = false;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* noop */
    }
  };

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const bufferedPercent = duration > 0 ? Math.min(100, (bufferedEnd / duration) * 100) : 0;

  return (
    <div style={styles.root}>
      <div
        style={styles.gestureLayer}
        onPointerDown={handleGesturePointerDown}
        onPointerMove={handleGesturePointerMove}
        onPointerUp={handleGesturePointerUp}
        onPointerCancel={handleGesturePointerCancel}
        onContextMenu={(event) => event.preventDefault()}
      >
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          autoPlay={autoPlay}
          playsInline
          preload="metadata"
          style={styles.video}
        />
        {speedActive && <div style={styles.speedBadge}>▶▶ 2×</div>}
        {skipFlash && (
          <div
            key={skipFlash.key}
            style={{
              ...styles.skipFlash,
              ...(skipFlash.side === 'left' ? styles.skipFlashLeft : styles.skipFlashRight),
            }}
          >
            {skipFlash.side === 'left' ? '⏪ −10' : '+10 ⏩'}
          </div>
        )}
        {!isPlaying && currentTime < 0.1 && (
          <div style={styles.bigPlay} aria-hidden="true">
            ▶
          </div>
        )}
      </div>

      <div style={styles.controls}>
        <button
          type="button"
          style={styles.playBtn}
          onClick={togglePlay}
          aria-label={isPlaying ? 'Пауза' : 'Воспроизвести'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <span style={styles.time}>{formatTime(currentTime)}</span>
        <div
          ref={barRef}
          style={styles.bar}
          onPointerDown={onBarPointerDown}
          onPointerMove={onBarPointerMove}
          onPointerUp={onBarPointerUp}
          onPointerCancel={onBarPointerUp}
        >
          <div style={styles.barTrack} />
          <div style={{ ...styles.barFillBuffered, width: `${bufferedPercent}%` }} />
          <div style={{ ...styles.barFillPlayed, width: `${progressPercent}%` }} />
          <div style={{ ...styles.barThumb, left: `${progressPercent}%` }} />
        </div>
        <span style={styles.time}>{formatTime(duration)}</span>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  root: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: '#000',
    position: 'relative',
    overflow: 'hidden',
  },
  gestureLayer: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    userSelect: 'none',
    touchAction: 'manipulation',
  },
  video: {
    width: '100%',
    height: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
    pointerEvents: 'none',
    background: '#000',
  },
  speedBadge: {
    position: 'absolute',
    top: 18,
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '6px 14px',
    borderRadius: 999,
    background: 'rgba(0,0,0,0.7)',
    color: '#fff',
    fontSize: 14,
    fontWeight: 700,
    pointerEvents: 'none',
    letterSpacing: 0.5,
  },
  skipFlash: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    padding: '12px 18px',
    borderRadius: 16,
    background: 'rgba(0,0,0,0.6)',
    color: '#fff',
    fontSize: 17,
    fontWeight: 700,
    pointerEvents: 'none',
    opacity: 0.95,
  },
  skipFlashLeft: { left: '12%' },
  skipFlashRight: { right: '12%' },
  bigPlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 72,
    height: 72,
    borderRadius: '50%',
    background: 'rgba(0,0,0,0.55)',
    color: '#fff',
    fontSize: 28,
    display: 'grid',
    placeItems: 'center',
    pointerEvents: 'none',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 100%)',
    flexShrink: 0,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(255,255,255,0.18)',
    color: '#fff',
    fontSize: 14,
    cursor: 'pointer',
    display: 'grid',
    placeItems: 'center',
  },
  time: {
    color: '#fff',
    fontSize: 12,
    minWidth: 48,
    textAlign: 'center',
    fontVariantNumeric: 'tabular-nums',
  },
  bar: {
    flex: 1,
    height: 18,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    touchAction: 'none',
  },
  barTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    borderRadius: 2,
    background: 'rgba(255,255,255,0.18)',
    pointerEvents: 'none',
  },
  barFillBuffered: {
    position: 'absolute',
    left: 0,
    height: 4,
    borderRadius: 2,
    background: 'rgba(255,255,255,0.34)',
    pointerEvents: 'none',
  },
  barFillPlayed: {
    position: 'absolute',
    left: 0,
    height: 4,
    borderRadius: 2,
    background: 'var(--color-primary, #fff)',
    pointerEvents: 'none',
  },
  barThumb: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: '50%',
    background: 'var(--color-primary, #fff)',
    transform: 'translateX(-50%)',
    pointerEvents: 'none',
    boxShadow: '0 0 0 2px rgba(0,0,0,0.35)',
  },
};
