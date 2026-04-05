import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { formatDistanceToNow } from 'date-fns';
import { Avatar } from '../../components/Avatar';
import { EmptyState } from '../../components/EmptyState';
import { useAuthStore } from '../../stores/auth.store';
import * as callsApi from '../../api/calls.api';

type CallData = callsApi.CallData;

function formatDuration(startedAt: string | null, endedAt: string | null): string {
  if (!startedAt || !endedAt) return '';
  const seconds = Math.round(
    (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000,
  );
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function CallsScreen() {
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
      const missed =
        item.status === 'REJECTED' || (item.status === 'MISSED' && !isOutgoing);
      const duration = formatDuration(item.startedAt, item.endedAt);
      const typeIcon = item.type === 'VIDEO' ? '🎥' : '📞';
      const directionLabel = isOutgoing ? 'Outgoing' : missed ? 'Missed' : 'Incoming';
      const labelColor = missed ? '#EF4444' : '#374151';
      const arrow = isOutgoing ? '↗ ' : '↙ ';

      return (
        <View style={styles.callItem}>
          <View style={styles.typeIcon}>
            <Text style={styles.typeIconText}>{typeIcon}</Text>
          </View>
          <View style={styles.callInfo}>
            <Text style={[styles.directionLabel, { color: labelColor }]}>
              {arrow}{directionLabel} {item.type === 'VIDEO' ? 'video' : 'audio'} call
            </Text>
            <View style={styles.callMeta}>
              {duration ? (
                <Text style={styles.duration}>{duration}</Text>
              ) : null}
              <Text style={styles.callTime}>
                {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
              </Text>
            </View>
          </View>
        </View>
      );
    },
    [currentUserId],
  );

  if (isLoading && calls.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={calls}
        keyExtractor={(item) => item.id}
        renderItem={renderCall}
        ListEmptyComponent={
          <EmptyState
            title="No call history"
            description="Your audio and video calls will appear here"
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4F46E5"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    gap: 12,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIconText: {
    fontSize: 18,
  },
  callInfo: {
    flex: 1,
  },
  directionLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  callMeta: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  duration: {
    fontSize: 12,
    color: '#6B7280',
  },
  callTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
