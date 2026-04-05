import React, { useEffect, useRef } from 'react';
import { Avatar } from '@/components/common/Avatar';

// ─── VideoTile ────────────────────────────────────────────────────────────────

interface VideoTileProps {
  stream: MediaStream | null;
  label: string;
  isLocal?: boolean;
  isScreenShare?: boolean;
  style?: React.CSSProperties;
}

function VideoTile({ stream, label, isLocal, isScreenShare, style }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const hasVideo =
    !!stream && stream.getVideoTracks().some((t) => t.enabled && t.readyState !== 'ended');

  return (
    <div style={{ ...styles.tile, ...style }}>
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          style={{
            ...styles.video,
            transform: isLocal && !isScreenShare ? 'scaleX(-1)' : 'none',
          }}
        />
      ) : (
        <div style={styles.avatarBox}>
          <Avatar name={label} size="lg" />
        </div>
      )}
      <span style={styles.label}>
        {isScreenShare ? '🖥 Screen' : isLocal ? 'You' : label}
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

export function VideoGrid({
  localStream,
  remoteStreams,
  screenStream,
  isScreenSharing,
}: VideoGridProps) {
  const remoteEntries = Object.entries(remoteStreams);
  const extraTiles = isScreenSharing ? 1 : 0; // screen share counts as a tile
  const total = 1 + remoteEntries.length + extraTiles;
  const cols = total <= 1 ? 1 : total <= 4 ? 2 : 3;

  return (
    <div style={{ ...styles.grid, gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {/* Screen share — spans full row when active */}
      {isScreenSharing && screenStream && (
        <div
          style={{
            gridColumn: cols > 1 ? `1 / ${cols + 1}` : '1',
            aspectRatio: '16/9',
            overflow: 'hidden',
            borderRadius: 4,
          }}
        >
          <VideoTile
            stream={screenStream}
            label="Screen"
            isLocal
            isScreenShare
            style={{ height: '100%' }}
          />
        </div>
      )}

      {/* Remote peers */}
      {remoteEntries.map(([userId, stream]) => (
        <VideoTile key={userId} stream={stream} label={userId.slice(0, 8)} />
      ))}

      {/* Local camera */}
      <VideoTile stream={localStream} label="You" isLocal />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: 'grid',
    gap: 4,
    width: '100%',
    height: '100%',
    background: '#000',
    padding: 4,
    boxSizing: 'border-box',
  },
  tile: {
    position: 'relative',
    background: '#1F2937',
    overflow: 'hidden',
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  video: { width: '100%', height: '100%', objectFit: 'cover' },
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
    background: 'rgba(0,0,0,0.55)',
    padding: '2px 6px',
    borderRadius: 4,
  },
};
