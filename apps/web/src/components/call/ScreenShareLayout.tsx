import React from 'react';
import { VideoTile } from './VideoGrid';

interface ScreenShareLayoutProps {
  screenStream: MediaStream;
  screenSharerId: string;
  isLocalSharer: boolean;
  localStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  containerWidth: number;
  activeSpeakerId: string | null;
  localUserId: string | null;
  onTileDoubleClick: (id: string) => void;
}

const NARROW_BREAKPOINT = 768;

export function ScreenShareLayout({
  screenStream,
  screenSharerId,
  isLocalSharer,
  localStream,
  remoteStreams,
  containerWidth,
  activeSpeakerId,
  localUserId,
  onTileDoubleClick,
}: ScreenShareLayoutProps) {
  const isNarrow = containerWidth > 0 && containerWidth < NARROW_BREAKPOINT;

  // When a remote peer is sharing, their video track now carries the screen,
  // so we exclude them from the camera strip.
  const cameraTiles: Array<{ id: string; stream: MediaStream | null; isLocal: boolean }> = [];
  if (localUserId && (isLocalSharer || screenSharerId !== localUserId)) {
    cameraTiles.push({ id: localUserId, stream: localStream, isLocal: true });
  }
  for (const [id, stream] of Object.entries(remoteStreams)) {
    if (!isLocalSharer && id === screenSharerId) continue;
    cameraTiles.push({ id, stream, isLocal: false });
  }

  if (isNarrow) {
    return (
      <div style={styles.verticalContainer}>
        <div style={styles.verticalScreen}>
          <VideoTile
            stream={screenStream}
            label="Screen"
            isScreenShare
            isLocal={isLocalSharer}
            objectFit="contain"
            onDoubleClick={() => onTileDoubleClick(screenSharerId)}
            style={{ width: '100%', height: '100%', borderRadius: 0 }}
          />
        </div>
        <div style={styles.bottomStrip}>
          {cameraTiles.map((t) => (
            <div key={t.id} style={styles.bottomStripTile}>
              <VideoTile
                stream={t.stream}
                label={t.id.slice(0, 8)}
                isLocal={t.isLocal}
                isActiveSpeaker={t.id === activeSpeakerId}
                onDoubleClick={() => onTileDoubleClick(t.id)}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.main}>
        <VideoTile
          stream={screenStream}
          label="Screen"
          isScreenShare
          isLocal={isLocalSharer}
          objectFit="contain"
          onDoubleClick={() => onTileDoubleClick(screenSharerId)}
          style={{ width: '100%', height: '100%', borderRadius: 0 }}
        />
      </div>
      <div style={styles.sidebar}>
        {cameraTiles.map((t) => (
          <div key={t.id} style={styles.sidebarTile}>
            <VideoTile
              stream={t.stream}
              label={t.id.slice(0, 8)}
              isLocal={t.isLocal}
              isActiveSpeaker={t.id === activeSpeakerId}
              onDoubleClick={() => onTileDoubleClick(t.id)}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
    height: '100%',
    background: '#000',
    gap: 4,
    padding: 4,
    boxSizing: 'border-box',
  },
  main: {
    flex: 1,
    minWidth: 0,
    background: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebar: {
    width: 220,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    overflowY: 'auto',
  },
  sidebarTile: {
    width: '100%',
    aspectRatio: '16 / 9',
    flexShrink: 0,
  },
  verticalContainer: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    background: '#000',
    gap: 4,
    padding: 4,
    boxSizing: 'border-box',
  },
  verticalScreen: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomStrip: {
    display: 'flex',
    flexDirection: 'row',
    height: 110,
    gap: 4,
    overflowX: 'auto',
  },
  bottomStripTile: {
    width: 160,
    flexShrink: 0,
    height: '100%',
  },
};
