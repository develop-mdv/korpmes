import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Avatar } from './Avatar';
import { Badge } from './Badge';
import { formatDistanceToNow } from 'date-fns';

interface ChatListItemProps {
  id: string;
  name: string;
  avatarUrl?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  onPress: (chatId: string) => void;
}

export const ChatListItem = memo(function ChatListItem({
  id,
  name,
  avatarUrl,
  lastMessage,
  lastMessageTime,
  unreadCount,
  onPress,
}: ChatListItemProps) {
  const timeLabel = lastMessageTime
    ? formatDistanceToNow(new Date(lastMessageTime), { addSuffix: true })
    : '';

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={() => onPress(id)}
    >
      <Avatar uri={avatarUrl} name={name} size={48} />
      <View style={styles.textContainer}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        {lastMessage && (
          <Text style={styles.message} numberOfLines={1}>
            {lastMessage}
          </Text>
        )}
      </View>
      <View style={styles.rightSide}>
        {timeLabel ? <Text style={styles.time}>{timeLabel}</Text> : null}
        {unreadCount > 0 && <Badge count={unreadCount} />}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  pressed: {
    backgroundColor: '#F3F4F6',
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  message: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  rightSide: {
    alignItems: 'flex-end',
    gap: 4,
  },
  time: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
