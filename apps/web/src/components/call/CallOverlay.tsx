import React, { useEffect, useState } from 'react';
import { Avatar } from '@/components/common/Avatar';
import { useCallStore } from '@/stores/call.store';
import { useAuthStore } from '@/stores/auth.store';
import { CallControls } from './CallControls';
import { VideoGrid } from './VideoGrid';
import * as callsApi from '@/api/calls.api';
import * as callManager from '@/services/call-manager';
import { audio } from '@/services/audio.service';

export function CallOverlay() {
  const { activeCall, localStream, remoteStreams, screenStream, isScreenSharing } = useCallStore();
  const userId = useAuthStore((s) => s.user?.id);
  const [callDuration, setCallDuration] = useState(0);

  const isIncoming = activeCall?.status === 'ringing' && activeCall.initiatorId !== userId;
  const isActive = activeCall?.status === 'active';

  // Timer
  useEffect(() => {
    if (!isActive) return;
    setCallDuration(0);
    const id = setInterval(() => setCallDuration((d) => d + 1), 1000);
    return () => clearInterval(id);
  }, [isActive]);

  if (!activeCall) return null;

  const handleAccept = async () => {
    audio.stopRinging();
    try {
      await callManager.acceptCall();
      await callsApi.answerCall(activeCall.id);
    } catch (err) {
      console.error('Failed to accept call:', err);
      callManager.cleanup();
    }
  };

  const handleDecline = async () => {
    audio.stopRinging();
    try { await callsApi.rejectCall(activeCall.id); } catch { /* ignore */ }
    callManager.hangup();
  };

  const handleHangup = async () => {
    audio.stopRinging();
    audio.playCallEnded();
    try { await callsApi.hangupCall(activeCall.id); } catch { /* ignore */ }
    callManager.hangup();
  };

  const formatDuration = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // ── Ringing UI ───────────────────────────────────────────────────────────────
  if (!isActive) {
    return (
      <div style={s.overlay}>
        <div style={s.card}>
          <Avatar name={activeCall.type === 'video' ? 'Video' : 'Audio'} size="lg" />
          <h3 style={s.title}>{activeCall.type === 'video' ? 'Video Call' : 'Audio Call'}</h3>
          <p style={s.status}>{isIncoming ? 'Incoming call...' : 'Calling...'}</p>
          <div style={s.actions}>
            {isIncoming && (
              <button style={{ ...s.btn, background: '#10B981' }} onClick={handleAccept}>
                Accept
              </button>
            )}
            <button
              style={{ ...s.btn, background: '#EF4444' }}
              onClick={isIncoming ? handleDecline : handleHangup}
            >
              {isIncoming ? 'Decline' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Active call UI ───────────────────────────────────────────────────────────
  const participantCount = (activeCall.participants?.length ?? 0);

  return (
    <div style={s.overlay}>
      <div style={s.activeCard}>
        <div style={s.videoArea}>
          <VideoGrid
            localStream={localStream}
            remoteStreams={remoteStreams}
            screenStream={screenStream}
            isScreenSharing={isScreenSharing}
          />
        </div>

        <div style={s.bar}>
          <span style={s.info}>
            {formatDuration(callDuration)}
            {participantCount > 1 && (
              <span style={s.participantBadge}>{participantCount} participants</span>
            )}
          </span>
          <CallControls onHangup={handleHangup} callType={activeCall.type} />
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  card: {
    background: '#fff', borderRadius: 16, padding: '32px 40px',
    textAlign: 'center', minWidth: 280,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
  },
  title: { fontSize: 20, fontWeight: 600, margin: 0, color: '#111' },
  status: { fontSize: 14, color: '#6B7280', margin: 0 },
  actions: { display: 'flex', gap: 12, marginTop: 16 },
  btn: {
    padding: '11px 28px', borderRadius: 24, border: 'none',
    color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
  },
  activeCard: {
    background: '#111827', borderRadius: 16,
    width: '92%', maxWidth: 960, height: '82vh',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  videoArea: { flex: 1, overflow: 'hidden' },
  bar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 20px', background: '#1F2937',
  },
  info: { color: '#fff', fontSize: 15, display: 'flex', alignItems: 'center', gap: 10 },
  participantBadge: {
    fontSize: 12, background: '#374151', color: '#D1D5DB',
    padding: '2px 8px', borderRadius: 10,
  },
};
