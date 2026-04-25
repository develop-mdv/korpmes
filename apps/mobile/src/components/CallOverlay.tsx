import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Avatar } from './Avatar';
import { useCallStore } from '../stores/call.store';
import { startRinging, stopRinging, playCallEnded } from '../services/audio.service';

interface CallOverlayProps {
  visible: boolean;
  isIncoming: boolean;
  callerName: string;
  callType: 'AUDIO' | 'VIDEO';
  onAccept?: () => void;
  onReject?: () => void;
}

export function CallOverlay({
  visible,
  isIncoming,
  callerName,
  callType,
  onAccept,
  onReject,
}: CallOverlayProps) {
  const { endCall } = useCallStore();

  useEffect(() => {
    if (visible && isIncoming) {
      startRinging();
    }
    return () => stopRinging();
  }, [visible, isIncoming]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Avatar name={callerName} size={80} />
          <Text style={styles.name}>{callerName}</Text>
          <Text style={styles.status}>
            {isIncoming
              ? `Incoming ${callType === 'VIDEO' ? 'Video' : 'Audio'} Call...`
              : 'Calling...'}
          </Text>

          <View style={styles.actions}>
            {isIncoming ? (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => {
                    stopRinging();
                    playCallEnded();
                    onReject?.();
                  }}
                >
                  <Text style={styles.actionText}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={() => {
                    stopRinging();
                    onAccept?.();
                  }}
                >
                  <Text style={styles.actionText}>Accept</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => {
                  stopRinging();
                  playCallEnded();
                  endCall();
                  onReject?.();
                }}
              >
                <Text style={styles.actionText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
  },
  status: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 6,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 32,
    gap: 16,
  },
  actionButton: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 30,
    minWidth: 110,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
