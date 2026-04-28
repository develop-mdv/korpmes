import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from './Avatar';
import { useCallStore } from '../stores/call.store';
import { startRinging, stopRinging, playCallEnded } from '../services/audio.service';
import { useTheme } from '../theme';

interface CallOverlayProps {
  visible: boolean;
  isIncoming: boolean;
  callerName: string;
  callType: 'AUDIO' | 'VIDEO';
  onAccept?: () => void;
  onReject?: () => void;
}

export function CallOverlay({ visible, isIncoming, callerName, callType, onAccept, onReject }: CallOverlayProps) {
  const theme = useTheme();
  const { endCall } = useCallStore();

  useEffect(() => {
    if (visible && isIncoming) {
      startRinging();
    }
    return () => stopRinging();
  }, [visible, isIncoming]);

  const statusLabel = isIncoming
    ? `Входящий ${callType === 'VIDEO' ? 'видеозвонок' : 'звонок'}…`
    : 'Соединение…';

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={[styles.overlay, { backgroundColor: theme.colors.overlay }]}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.borderStrong,
              ...theme.shadows.lg,
            },
          ]}
        >
          <Avatar name={callerName} size={88} />
          <Text style={[styles.name, { color: theme.colors.textPrimary, fontFamily: theme.typography.displayFamily }]}>
            {callerName}
          </Text>
          <Text style={[styles.status, { color: theme.colors.textSecondary }]}>{statusLabel}</Text>

          <View style={styles.actions}>
            {isIncoming ? (
              <>
                <TouchableOpacity
                  style={[styles.iconBtn, { backgroundColor: theme.colors.error }]}
                  onPress={() => {
                    stopRinging();
                    playCallEnded();
                    onReject?.();
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="close" size={28} color={theme.colors.onPrimary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.iconBtn, { backgroundColor: theme.colors.success }]}
                  onPress={() => {
                    stopRinging();
                    onAccept?.();
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name={callType === 'VIDEO' ? 'videocam' : 'call'} size={26} color={theme.colors.onPrimary} />
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.iconBtn, { backgroundColor: theme.colors.error }]}
                onPress={() => {
                  stopRinging();
                  playCallEnded();
                  endCall();
                  onReject?.();
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="close" size={28} color={theme.colors.onPrimary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { borderRadius: 32, borderWidth: 1, padding: 32, alignItems: 'center', width: '85%' },
  name: { fontSize: 24, fontWeight: '700', marginTop: 18 },
  status: { fontSize: 15, marginTop: 6 },
  actions: { flexDirection: 'row', marginTop: 32, gap: 24 },
  iconBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
