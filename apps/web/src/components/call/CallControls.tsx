import React from 'react';
import { useCallStore } from '@/stores/call.store';
import * as callManager from '@/services/call-manager';

interface CallControlsProps {
  onHangup: () => void;
  callType: 'audio' | 'video';
}

export function CallControls({ onHangup, callType }: CallControlsProps) {
  const { isMuted, isVideoOff, isScreenSharing, toggleMute, toggleVideo } = useCallStore();

  const handleScreenShare = () => {
    if (isScreenSharing) callManager.stopScreenShare();
    else callManager.startScreenShare();
  };

  return (
    <div style={styles.container}>
      {/* Mute */}
      <button
        style={{ ...styles.btn, ...(isMuted ? styles.active : {}) }}
        onClick={toggleMute}
        title={isMuted ? 'Включить микрофон' : 'Выключить микрофон'}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {isMuted ? (
            <>
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" />
              <path d="M17 16.95A7 7 0 015 12v-2m14 0v2c0 .76-.12 1.49-.35 2.17" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </>
          ) : (
            <>
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
              <path d="M19 10v2a7 7 0 01-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </>
          )}
        </svg>
      </button>

      {/* Video toggle — только для видео-звонков */}
      {callType === 'video' && (
        <button
          style={{ ...styles.btn, ...(isVideoOff ? styles.active : {}) }}
          onClick={toggleVideo}
          title={isVideoOff ? 'Включить камеру' : 'Выключить камеру'}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {isVideoOff ? (
              <>
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M21 7l-5 3.5V7a2 2 0 00-2-2H5.5" />
                <path d="M2 7v10a2 2 0 002 2h12" />
              </>
            ) : (
              <>
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </>
            )}
          </svg>
        </button>
      )}

      {/* Screen share — только для видео-звонков */}
      {callType === 'video' && (
        <button
          style={{ ...styles.btn, ...(isScreenSharing ? styles.active : {}) }}
          onClick={handleScreenShare}
          title={isScreenSharing ? 'Остановить показ экрана' : 'Показать экран'}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {isScreenSharing ? (
              <>
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </>
            ) : (
              <>
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="13" />
              </>
            )}
          </svg>
        </button>
      )}

      {/* Hangup */}
      <button style={{ ...styles.btn, ...styles.hangup }} onClick={onHangup} title="Завершить звонок">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45c.907.34 1.85.573 2.81.7A2 2 0 0122 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center',
  },
  btn: {
    width: 48, height: 48, borderRadius: '50%', border: 'none',
    background: '#374151', color: '#fff', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background 0.15s',
  },
  active: { background: '#6B7280' },
  hangup: { background: '#EF4444', width: 52, height: 52 },
};
