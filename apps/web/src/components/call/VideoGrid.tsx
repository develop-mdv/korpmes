import React, { useEffect, useRef } from 'react';
import { Avatar } from '@/components/common/Avatar';
import { useElementSize } from '@/hooks/useElementSize';
import { useCallStore } from '@/stores/call.store';
import { useAuthStore } from '@/stores/auth.store';
import { ScreenShareLayout } from './ScreenShareLayout';

// ─── VideoTile ────────────────────────────────────────────────────────────────

interface VideoTileProps {
  stream: MediaStream | null;
  label: string;
  isLocal?: boolean;
  isScreenShare?: boolean;
  isActiveSpeaker?: boolean;
  objectFit?: 'cover' | 'contain';
  onDoubleClick?: () => void;
  style?: React.CSSProperties;
}

export function VideoTile({
  stream,
  label,
  isLocal,
  isScreenShare,
  isActiveSpeaker,
  objectFit = 'cover',
  onDoubleClick,
  style,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  const hasVideo =
    !!stream && stream.getVideoTracks().some((t) => t.enabled && t.readyState !== 'ended');

  const tileStyle: React.CSSProperties = {
    ...styles.tile,
    ...(isActiveSpeaker ? { outline: '2px solid #d4b16a', outlineOffset: -2 } : {}),
    ...style,
  };

  return (
    <div style={tileStyle} onDoubleClick={onDoubleClick}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        style={{
          ...styles.video,
          objectFit,
          display: hasVideo ? 'block' : 'none',
          transform: isLocal && !isScreenShare ? 'scaleX(-1)' : 'none',
        }}
      />
      {!hasVideo && (
        <div style={styles.avatarBox}>
          <Avatar name={label} size="lg" />
        </div>
      )}
      <span style={styles.label}>
        {isScreenShare ? 'Экран' : isLocal ? 'Вы' : label}
      </span>
    </div>
  );
}

// ─── VideoGrid ────────────────────────────────────────────────────────────────

interface VideoGridProps {
  localStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  screenStream: MediaStream | null;
  isScreenSharing: boolean;
}

const MIN_TILE_WIDTH = 220;
const MAX_COLS = 4;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function VideoGrid({
  localStream,
  remoteStreams,
  screenStream,
  isScreenSharing,
}: VideoGridProps) {
  const [containerRef, size] = useElementSize<HTMLDivElement>();
  const layoutMode = useCallStore((s) => s.layoutMode);
  const activeSpeakerId = useCallStore((s) => s.activeSpeakerId);
  const fullscreenUserId = useCallStore((s) => s.fullscreenUserId);
  const screenSharerId = useCallStore((s) => s.screenSharerId);
  const setFullscreenUserId = useCallStore((s) => s.setFullscreenUserId);
  const localUserId = useAuthStore((s) => s.user?.id);

  // Esc to exit fullscreen
  useEffect(() => {
    if (!fullscreenUserId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return;
      setFullscreenUserId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreenUserId, setFullscreenUserId]);

  const remoteEntries = Object.entries(remoteStreams);

  // ── Screen share: dedicated sidebar layout ─────────────────────────────
  if (isScreenSharing && screenSharerId) {
    const isLocalSharer = screenSharerId === localUserId;
    const screenContent = isLocalSharer
      ? screenStream
      : remoteStreams[screenSharerId] ?? null;

    if (screenContent) {
      return (
        <div ref={containerRef} style={styles.fillContainer}>
          <ScreenShareLayout
            screenStream={screenContent}
            screenSharerId={screenSharerId}
            isLocalSharer={isLocalSharer}
            localStream={localStream}
            remoteStreams={remoteStreams}
            containerWidth={size.width}
            activeSpeakerId={activeSpeakerId}
            localUserId={localUserId ?? null}
            onTileDoubleClick={(id) => setFullscreenUserId(id)}
          />
        </div>
      );
    }
  }

  // ── Fullscreen single tile ─────────────────────────────────────────────
  if (fullscreenUserId) {
    const stream =
      fullscreenUserId === localUserId
        ? localStream
        : remoteStreams[fullscreenUserId] ?? null;
    return (
      <div ref={containerRef} style={styles.fillContainer}>
        <VideoTile
          stream={stream}
          label={fullscreenUserId.slice(0, 8)}
          isLocal={fullscreenUserId === localUserId}
          objectFit="contain"
          onDoubleClick={() => setFullscreenUserId(null)}
          style={{ width: '100%', height: '100%', borderRadius: 0 }}
        />
      </div>
    );
  }

  // ── Speaker mode ───────────────────────────────────────────────────────
  if (layoutMode === 'speaker' && remoteEntries.length > 0) {
    const mainId =
      activeSpeakerId && activeSpeakerId !== localUserId
        ? activeSpeakerId
        : remoteEntries[0][0];
    const mainStream =
      mainId === localUserId
        ? localStream
        : remoteStreams[mainId] ?? remoteEntries[0][1];
    const stripTiles: Array<{ id: string; stream: MediaStream | null; isLocal: boolean }> = [];
    if (localUserId) {
      stripTiles.push({ id: localUserId, stream: localStream, isLocal: true });
    }
    for (const [id, stream] of remoteEntries) {
      if (id === mainId) continue;
      stripTiles.push({ id, stream, isLocal: false });
    }

    return (
      <div ref={containerRef} style={styles.speakerContainer}>
        <div style={styles.speakerMain}>
          <VideoTile
            stream={mainStream}
            label={mainId.slice(0, 8)}
            isLocal={mainId === localUserId}
            isActiveSpeaker={mainId === activeSpeakerId}
            objectFit="contain"
            onDoubleClick={() => setFullscreenUserId(mainId)}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
        <div style={styles.speakerStrip}>
          {stripTiles.map((t) => (
            <div key={t.id} style={styles.speakerStripTile}>
              <VideoTile
                stream={t.stream}
                label={t.id.slice(0, 8)}
                isLocal={t.isLocal}
                isActiveSpeaker={t.id === activeSpeakerId}
                onDoubleClick={() => setFullscreenUserId(t.id)}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Grid mode (default) ────────────────────────────────────────────────
  const total = 1 + remoteEntries.length;
  const width = size.width || 800;
  const cols = clamp(
    Math.floor(width / MIN_TILE_WIDTH),
    1,
    Math.min(MAX_COLS, Math.max(1, total)),
  );

  return (
    <div
      ref={containerRef}
      style={{ ...styles.grid, gridTemplateColumns: `repeat(${cols}, 1fr)` }}
    >
      {remoteEntries.map(([userId, stream]) => (
        <VideoTile
          key={userId}
          stream={stream}
          label={userId.slice(0, 8)}
          isActiveSpeaker={userId === activeSpeakerId}
          onDoubleClick={() => setFullscreenUserId(userId)}
        />
      ))}
      {localUserId && (
        <VideoTile
          stream={localStream}
          label="Вы"
          isLocal
          isActiveSpeaker={localUserId === activeSpeakerId}
          onDoubleClick={() => setFullscreenUserId(localUserId)}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  fillContainer: {
    width: '100%',
    height: '100%',
    background: '#101217',
    overflow: 'hidden',
  },
  grid: {
    display: 'grid',
    gap: 4,
    width: '100%',
    height: '100%',
    background: '#101217',
    padding: 6,
    boxSizing: 'border-box',
    gridAutoRows: '1fr',
  },
  speakerContainer: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    background: '#101217',
    gap: 6,
    padding: 6,
    boxSizing: 'border-box',
  },
  speakerMain: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  speakerStrip: {
    display: 'flex',
    flexDirection: 'row',
    height: 110,
    gap: 4,
    overflowX: 'auto',
  },
  speakerStripTile: {
    width: 160,
    flexShrink: 0,
    height: '100%',
  },
  tile: {
    position: 'relative',
    background: 'linear-gradient(145deg, #181b22, #101217)',
    overflow: 'hidden',
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    cursor: 'pointer',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  video: { width: '100%', height: '100%' },
  avatarBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  label: {
    position: 'absolute',
    bottom: 8,
    left: 10,
    color: '#fff',
    fontSize: 12,
    background: 'rgba(0,0,0,0.58)',
    padding: '4px 8px',
    borderRadius: 999,
    pointerEvents: 'none',
  },
};
