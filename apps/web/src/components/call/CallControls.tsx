import { useCallStore } from '@/stores/call.store';
import * as callManager from '@/services/call-manager';

interface CallControlsProps {
  onHangup: () => void;
  callType: 'audio' | 'video';
  compact?: boolean;
}

function Icon({
  kind,
  crossed,
}: {
  kind: 'mic' | 'video' | 'screen' | 'grid' | 'speaker' | 'phone';
  crossed?: boolean;
}) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {kind === 'mic' && (
        <>
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </>
      )}
      {kind === 'video' && (
        <>
          <path d="M23 7l-7 5 7 5V7z" />
          <rect x="1" y="5" width="15" height="14" rx="2" />
        </>
      )}
      {kind === 'screen' && (
        <>
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="13" />
        </>
      )}
      {kind === 'grid' && (
        <>
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
        </>
      )}
      {kind === 'speaker' && (
        <>
          <rect x="3" y="4" width="18" height="12" rx="2" />
          <line x1="7" y1="20" x2="17" y2="20" />
          <line x1="12" y1="16" x2="12" y2="20" />
        </>
      )}
      {kind === 'phone' && (
        <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91" />
      )}
      {crossed && <line x1="2" y1="2" x2="22" y2="22" />}
    </svg>
  );
}

export function CallControls({ onHangup, callType, compact = false }: CallControlsProps) {
  const { isMuted, isVideoOff, isScreenSharing, layoutMode, toggleMute, toggleVideo, setLayoutMode } = useCallStore();
  const remoteCount = useCallStore((state) => Object.keys(state.remoteStreams).length);
  const showLayoutToggle = callType === 'video' && remoteCount > 0;

  const buttonBase = compact ? styles.buttonCompact : styles.button;
  const hangupBase = compact ? styles.hangupCompact : styles.hangup;

  const handleScreenShare = () => {
    if (isScreenSharing) {
      callManager.stopScreenShare();
    } else {
      callManager.startScreenShare();
    }
  };

  return (
    <div style={{ ...styles.container, ...(compact ? styles.containerCompact : {}) }}>
      <button
        style={{ ...buttonBase, ...(isMuted ? styles.active : {}) }}
        onClick={toggleMute}
        title={isMuted ? 'Включить микрофон' : 'Выключить микрофон'}
        aria-label={isMuted ? 'Включить микрофон' : 'Выключить микрофон'}
      >
        <Icon kind="mic" crossed={isMuted} />
      </button>

      {callType === 'audio' && (
        <button style={buttonBase} onClick={() => callManager.upgradeToVideo()} title="Включить видео" aria-label="Включить видео">
          <Icon kind="video" />
        </button>
      )}

      {callType === 'video' && (
        <button
          style={{ ...buttonBase, ...(isVideoOff ? styles.active : {}) }}
          onClick={toggleVideo}
          title={isVideoOff ? 'Включить камеру' : 'Выключить камеру'}
          aria-label={isVideoOff ? 'Включить камеру' : 'Выключить камеру'}
        >
          <Icon kind="video" crossed={isVideoOff} />
        </button>
      )}

      {callType === 'video' && (
        <button
          style={{ ...buttonBase, ...(isScreenSharing ? styles.active : {}) }}
          onClick={handleScreenShare}
          title={isScreenSharing ? 'Остановить показ экрана' : 'Показать экран'}
          aria-label={isScreenSharing ? 'Остановить показ экрана' : 'Показать экран'}
        >
          <Icon kind="screen" crossed={isScreenSharing} />
        </button>
      )}

      {showLayoutToggle && (
        <button
          style={buttonBase}
          onClick={() => setLayoutMode(layoutMode === 'grid' ? 'speaker' : 'grid')}
          title={layoutMode === 'grid' ? 'Режим докладчика' : 'Режим сетки'}
          aria-label={layoutMode === 'grid' ? 'Режим докладчика' : 'Режим сетки'}
        >
          <Icon kind={layoutMode === 'grid' ? 'speaker' : 'grid'} />
        </button>
      )}

      {callType === 'video' && (
        <button style={buttonBase} onClick={() => callManager.downgradeToAudio()} title="Переключить на аудио" aria-label="Переключить на аудио">
          <Icon kind="mic" />
        </button>
      )}

      <button style={{ ...buttonBase, ...hangupBase }} onClick={onHangup} title="Завершить звонок" aria-label="Завершить звонок">
        <Icon kind="phone" crossed />
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    gap: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  containerCompact: {
    width: '100%',
  },
  button: {
    width: 46,
    height: 46,
    borderRadius: '50%',
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.1)',
    color: '#fff',
    cursor: 'pointer',
    display: 'grid',
    placeItems: 'center',
  },
  buttonCompact: {
    width: 42,
    height: 42,
    borderRadius: '50%',
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.1)',
    color: '#fff',
    cursor: 'pointer',
    display: 'grid',
    placeItems: 'center',
  },
  active: {
    background: 'rgba(212, 177, 106, 0.28)',
    color: '#f4dda5',
  },
  hangup: {
    width: 52,
    height: 52,
    background: 'var(--color-error)',
    borderColor: 'transparent',
  },
  hangupCompact: {
    width: 46,
    height: 46,
    background: 'var(--color-error)',
    borderColor: 'transparent',
  },
};
