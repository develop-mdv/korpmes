import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from './Avatar';
import { Badge } from './Badge';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useTheme } from '../theme';

interface ChatListItemProps {
  id: string;
  name: string;
  avatarUrl?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  isSelf?: boolean;
  onPress: (chatId: string) => void;
}

function SelfChatAvatar({ size = 48 }: { size?: number }) {
  const theme = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: theme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name="bookmark" size={Math.round(size * 0.5)} color={theme.colors.onPrimary} />
    </View>
  );
}

export const ChatListItem = memo(function ChatListItem({
  id,
  name,
  avatarUrl,
  lastMessage,
  lastMessageTime,
  unreadCount,
  isSelf,
  onPress,
}: ChatListItemProps) {
  const theme = useTheme();
  const timeLabel = lastMessageTime
    ? formatDistanceToNow(new Date(lastMessageTime), { addSuffix: true, locale: ru })
    : '';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: pressed ? theme.colors.surfaceSoft : 'transparent',
          borderBottomColor: theme.colors.border,
        },
      ]}
      onPress={() => onPress(id)}
    >
      {isSelf ? <SelfChatAvatar size={48} /> : <Avatar uri={avatarUrl} name={name} size={48} />}
      <View style={styles.textContainer}>
        <Text style={[styles.name, { color: theme.colors.textPrimary }]} numberOfLines={1}>
          {name}
        </Text>
        {lastMessage && (
          <Text style={[styles.message, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {lastMessage}
          </Text>
        )}
      </View>
      <View style={styles.rightSide}>
        {timeLabel ? <Text style={[styles.time, { color: theme.colors.textTertiary }]}>{timeLabel}</Text> : null}
        {unreadCount > 0 && <Badge count={unreadCount} variant="primary" />}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  textContainer: { flex: 1, marginLeft: 12, marginRight: 8 },
  name: { fontSize: 16, fontWeight: '600' },
  message: { fontSize: 14, marginTop: 2 },
  rightSide: { alignItems: 'flex-end', gap: 4 },
  time: { fontSize: 12 },
});
