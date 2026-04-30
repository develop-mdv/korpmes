import { useEffect, useState } from 'react';
import { Avatar } from '@/components/common/Avatar';
import { useCallStore } from '@/stores/call.store';
import { useAuthStore } from '@/stores/auth.store';
import { CallControls } from './CallControls';
import { VideoGrid } from './VideoGrid';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import * as callsApi from '@/api/calls.api';
import * as callManager from '@/services/call-manager';
import { audio } from '@/services/audio.service';

export function CallOverlay() {
  const { activeCall, localStream, remoteStreams, screenStream, isScreenSharing } = useCallStore();
  const userId = useAuthStore((state) => state.user?.id);
  const [callDuration, setCallDuration] = useState(0);
  const { isMobile } = useBreakpoint();

  const isIncoming = activeCall?.status === 'ringing' && activeCall.initiatorId !== userId;
  const isActive = activeCall?.status === 'active';

  useEffect(() => {
    if (!isActive) {
      return undefined;
    }

    setCallDuration(0);
    const intervalId = window.setInterval(() => setCallDuration((duration) => duration + 1), 1000);
    return () => window.clearInterval(intervalId);
  }, [isActive]);

  if (!activeCall) {
    return null;
  }

  const handleAccept = async () => {
    audio.stopRinging();
    try {
      await callManager.acceptCall();
      await callsApi.answerCall(activeCall.id);
    } catch (error) {
      console.error('Failed to accept call:', error);
      callManager.cleanup();
    }
  };

  const handleDecline = async () => {
    audio.stopRinging();
    try {
      await callsApi.rejectCall(activeCall.id);
    } catch {
      // Call may already be closed by another participant.
    }
    callManager.hangup();
  };

  const handleHangup = async () => {
    audio.stopRinging();
    audio.playCallEnded();
    try {
      await callsApi.hangupCall(activeCall.id);
    } catch {
      // Local cleanup still matters even if the network request races the socket event.
    }
    callManager.hangup();
  };

  const formatDuration = (seconds: number) =>
    `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

  if (!isActive) {
    return (
      <div style={styles.overlay}>
        <div style={{ ...styles.ringingCard, ...(isMobile ? styles.ringingCardMobile : {}) }}>
          <div style={styles.ringingHalo}>
            <Avatar name={activeCall.type === 'video' ? 'Видео' : 'Аудио'} size="lg" />
          </div>
          <div style={styles.ringingKicker}>{isIncoming ? 'Входящий звонок' : 'Идёт вызов'}</div>
          <h3 style={styles.ringingTitle}>{activeCall.type === 'video' ? 'Видеозвонок' : 'Аудиозвонок'}</h3>
          <p style={styles.ringingStatus}>
            {isIncoming ? 'Ответьте, чтобы подключиться к разговору.' : 'Ожидаем ответа собеседника.'}
          </p>
          <div style={{ ...styles.ringingActions, ...(isMobile ? styles.ringingActionsMobile : {}) }}>
            {isIncoming && (
              <button style={{ ...styles.ringingButton, ...styles.acceptButton }} onClick={handleAccept}>
                Принять
              </button>
            )}
            <button
              style={{ ...styles.ringingButton, ...styles.declineButton }}
              onClick={isIncoming ? handleDecline : handleHangup}
            >
              {isIncoming ? 'Отклонить' : 'Отменить'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const participantCount = activeCall.participants?.length ?? 0;
  const activeCardStyle = {
    ...styles.activeCard,
    ...(isScreenSharing ? styles.activeCardScreenShare : {}),
    ...(isMobile ? styles.activeCardMobile : {}),
  };
  const barStyle = {
    ...styles.callBar,
    ...(isMobile ? styles.callBarMobile : {}),
  };

  return (
    <div style={styles.overlay}>
      <div style={activeCardStyle}>
        <div style={styles.videoArea}>
          <VideoGrid
            localStream={localStream}
            remoteStreams={remoteStreams}
            screenStream={screenStream}
            isScreenSharing={isScreenSharing}
          />
        </div>

        <div style={barStyle}>
          <div style={styles.callInfo}>
            <span style={styles.duration}>{formatDuration(callDuration)}</span>
            <span style={styles.callType}>{activeCall.type === 'video' ? 'Видео' : 'Аудио'}</span>
            {participantCount > 1 && <span style={styles.participantBadge}>{participantCount} участников</span>}
          </div>
          <CallControls onHangup={handleHangup} callType={activeCall.type} compact={isMobile} />
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    background: 'rgba(16, 13, 9, 0.72)',
    backdropFilter: 'blur(18px)',
  },
  ringingCard: {
    width: 'min(420px, 100%)',
    padding: '30px 32px',
    borderRadius: 28,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
    background: 'var(--color-surface-strong)',
    color: 'var(--color-text)',
    border: '1px solid var(--color-border)',
    boxShadow: 'var(--shadow-lg)',
  },
  ringingCardMobile: {
    padding: '24px 20px',
    borderRadius: 22,
  },
  ringingHalo: {
    padding: 10,
    borderRadius: '50%',
    background: 'var(--color-primary-faint)',
    border: '1px solid var(--color-border-strong)',
  },
  ringingKicker: {
    marginTop: 8,
    color: 'var(--color-primary-dark)',
    fontSize: 12,
    fontWeight: 800,
    textTransform: 'uppercase',
  },
  ringingTitle: {
    margin: 0,
    fontFamily: 'var(--font-display)',
    fontSize: 34,
    lineHeight: 1,
  },
  ringingStatus: {
    margin: 0,
    color: 'var(--color-text-secondary)',
    fontSize: 14,
  },
  ringingActions: {
    display: 'flex',
    gap: 10,
    marginTop: 14,
  },
  ringingActionsMobile: {
    width: '100%',
    flexDirection: 'column',
  },
  ringingButton: {
    minHeight: 44,
    padding: '0 22px',
    borderRadius: 999,
    border: 'none',
    color: '#fff',
    fontSize: 14,
    fontWeight: 800,
    cursor: 'pointer',
  },
  acceptButton: {
    background: 'var(--color-success)',
  },
  declineButton: {
    background: 'var(--color-error)',
  },
  activeCard: {
    width: 'min(1120px, 94vw)',
    height: 'min(760px, 86vh)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    borderRadius: 24,
    background: '#111318',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 32px 90px rgba(0,0,0,0.38)',
  },
  activeCardScreenShare: {
    width: 'min(1280px, 96vw)',
    height: '90vh',
  },
  activeCardMobile: {
    width: '100vw',
    height: '100dvh',
    maxWidth: 'none',
    borderRadius: 0,
  },
  videoArea: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  callBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    padding: '12px 18px',
    background: 'rgba(18, 20, 26, 0.96)',
    borderTop: '1px solid rgba(255,255,255,0.08)',
  },
  callBarMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    padding: '10px 12px max(10px, env(safe-area-inset-bottom))',
  },
  callInfo: {
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  duration: {
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 800,
  },
  callType: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 13,
  },
  participantBadge: {
    padding: '4px 9px',
    borderRadius: 999,
    color: 'rgba(255,255,255,0.78)',
    background: 'rgba(255,255,255,0.09)',
    fontSize: 12,
    whiteSpace: 'nowrap',
  },
};
