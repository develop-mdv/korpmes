import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { EmptyState } from '../../components/EmptyState';
import { useAuthStore } from '../../stores/auth.store';
import { useTheme } from '../../theme';
import * as callsApi from '../../api/calls.api';

type CallData = callsApi.CallData;

function formatDuration(startedAt: string | null, endedAt: string | null): string {
  if (!startedAt || !endedAt) return '';
  const seconds = Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000);
  if (seconds < 60) return `${seconds} с`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function CallsScreen() {
  const theme = useTheme();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const [calls, setCalls] = useState<CallData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCalls = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await callsApi.getAllCallHistory();
      setCalls(data);
    } catch (err) {
      console.error('Failed to fetch calls:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCalls();
    setRefreshing(false);
  }, [fetchCalls]);

  const renderCall = useCallback(
    ({ item }: { item: CallData }) => {
      const isOutgoing = item.initiatedBy === currentUserId;
      const missed = item.status === 'REJECTED' || (item.status === 'MISSED' && !isOutgoing);
      const duration = formatDuration(item.startedAt, item.endedAt);
      const directionLabel = isOutgoing ? 'Исходящий' : missed ? 'Пропущенный' : 'Входящий';
      const labelColor = missed ? theme.colors.error : theme.colors.textPrimary;
      const arrowName = isOutgoing ? 'arrow-up-outline' : 'arrow-down-outline';
      const typeName = item.type === 'VIDEO' ? 'videocam' : 'call';

      return (
        <View style={[styles.callItem, { borderBottomColor: theme.colors.border }]}>
          <View style={[styles.typeIcon, { backgroundColor: theme.colors.surfaceSoft }]}>
            <Ionicons name={typeName} size={20} color={theme.colors.primary} />
          </View>
          <View style={styles.callInfo}>
            <View style={styles.callTitleRow}>
              <Ionicons name={arrowName} size={14} color={labelColor} />
              <Text style={[styles.directionLabel, { color: labelColor }]}>
                {directionLabel} {item.type === 'VIDEO' ? 'видеозвонок' : 'звонок'}
              </Text>
            </View>
            <View style={styles.callMeta}>
              {duration ? (
                <Text style={[styles.duration, { color: theme.colors.textSecondary }]}>{duration}</Text>
              ) : null}
              <Text style={[styles.callTime, { color: theme.colors.textTertiary }]}>
                {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: ru })}
              </Text>
            </View>
          </View>
        </View>
      );
    },
    [currentUserId, theme],
  );

  if (isLoading && calls.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.bg }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <FlatList
        data={calls}
        keyExtractor={(item) => item.id}
        renderItem={renderCall}
        ListEmptyComponent={
          <EmptyState
            title="История пуста"
            description="Здесь появится история ваших звонков."
            icon={<Ionicons name="call-outline" size={56} color={theme.colors.primary} />}
          />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  callItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  typeIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  callInfo: { flex: 1 },
  callTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  directionLabel: { fontSize: 14, fontWeight: '600' },
  callMeta: { flexDirection: 'row', gap: 8, marginTop: 4 },
  duration: { fontSize: 12 },
  callTime: { fontSize: 12 },
});
