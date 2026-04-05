import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { format } from 'date-fns';

interface MessageBubbleProps {
  content: string;
  senderName: string;
  createdAt: string;
  isOwn: boolean;
  isEdited: boolean;
  showSender?: boolean;
  replyCount?: number;
  onOpenThread?: () => void;
}

export const MessageBubble = memo(function MessageBubble({
  content,
  senderName,
  createdAt,
  isOwn,
  isEdited,
  showSender = false,
  replyCount,
  onOpenThread,
}: MessageBubbleProps) {
  const time = format(new Date(createdAt), 'HH:mm');
  const hasThread = (replyCount ?? 0) > 0 || onOpenThread !== undefined;

  const bubbleContent = (
    <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
      {showSender && !isOwn && (
        <Text style={styles.senderName}>{senderName}</Text>
      )}
      <Text style={[styles.content, isOwn ? styles.contentOwn : styles.contentOther]}>
        {content}
      </Text>
      <View style={styles.meta}>
        {isEdited && (
          <Text style={[styles.edited, isOwn ? styles.metaOwn : styles.metaOther]}>
            edited
          </Text>
        )}
        <Text style={[styles.time, isOwn ? styles.metaOwn : styles.metaOther]}>
          {time}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.wrapper, isOwn ? styles.wrapperOwn : styles.wrapperOther]}>
      {onOpenThread ? (
        <TouchableOpacity onLongPress={onOpenThread} activeOpacity={0.85}>
          {bubbleContent}
        </TouchableOpacity>
      ) : (
        bubbleContent
      )}

      {/* Thread indicator */}
      {hasThread && replyCount !== undefined && replyCount > 0 && (
        <TouchableOpacity
          style={[styles.threadBtn, isOwn ? styles.threadBtnOwn : styles.threadBtnOther]}
          onPress={onOpenThread}
          activeOpacity={0.7}
        >
          <Text style={styles.threadBtnText}>
            {replyCount} {replyCount === 1 ? 'reply' : 'replies'} →
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 12,
    marginVertical: 2,
  },
  wrapperOwn: {
    alignItems: 'flex-end',
  },
  wrapperOther: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  bubbleOwn: {
    backgroundColor: '#4F46E5',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4F46E5',
    marginBottom: 2,
  },
  content: {
    fontSize: 15,
    lineHeight: 20,
  },
  contentOwn: {
    color: '#FFFFFF',
  },
  contentOther: {
    color: '#111827',
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 2,
  },
  time: {
    fontSize: 11,
  },
  metaOwn: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  metaOther: {
    color: '#9CA3AF',
  },
  edited: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  threadBtn: {
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  threadBtnOwn: {
    borderColor: 'rgba(79,70,229,0.4)',
    backgroundColor: 'rgba(79,70,229,0.06)',
  },
  threadBtnOther: {
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  threadBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4F46E5',
  },
});
