import React, { memo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Linking,
} from 'react-native';
import { format } from 'date-fns';
import { useFileStore } from '../stores/file.store';

interface MessageBubbleProps {
  content: string;
  senderName: string;
  createdAt: string;
  isOwn: boolean;
  isEdited: boolean;
  showSender?: boolean;
  replyCount?: number;
  attachments?: string[];
  onOpenThread?: () => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function AttachmentItem({ fileId, isOwn }: { fileId: string; isOwn: boolean }) {
  const fetchFile = useFileStore((s) => s.fetchFile);
  const file = useFileStore((s) => s.filesById[fileId]);

  useEffect(() => {
    if (!file) void fetchFile(fileId);
  }, [fileId, file, fetchFile]);

  if (!file) {
    return (
      <View style={attachStyles.skeleton}>
        <Text style={attachStyles.skeletonText}>Loading…</Text>
      </View>
    );
  }

  const isImage = file.mimeType.startsWith('image/');
  const previewSrc = file.thumbnailUrl || file.signedUrl;
  const openUrl = () => {
    if (file.signedUrl) void Linking.openURL(file.signedUrl);
  };

  if (isImage && previewSrc) {
    return (
      <TouchableOpacity onPress={openUrl} activeOpacity={0.85}>
        <Image source={{ uri: previewSrc }} style={attachStyles.image} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[attachStyles.card, isOwn ? attachStyles.cardOwn : attachStyles.cardOther]}
      onPress={openUrl}
      activeOpacity={0.85}
    >
      <Text style={attachStyles.icon}>📎</Text>
      <View style={attachStyles.info}>
        <Text numberOfLines={1} style={[attachStyles.name, isOwn && attachStyles.nameOwn]}>
          {file.originalName}
        </Text>
        <Text style={[attachStyles.meta, isOwn && attachStyles.metaOwn]}>
          {formatSize(file.sizeBytes)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export const MessageBubble = memo(function MessageBubble({
  content,
  senderName,
  createdAt,
  isOwn,
  isEdited,
  showSender = false,
  replyCount,
  attachments = [],
  onOpenThread,
}: MessageBubbleProps) {
  const parsedDate = new Date(createdAt);
  const time = Number.isNaN(parsedDate.getTime()) ? '' : format(parsedDate, 'HH:mm');
  const hasThread = (replyCount ?? 0) > 0 || onOpenThread !== undefined;

  const bubbleContent = (
    <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
      {showSender && !isOwn && <Text style={styles.senderName}>{senderName}</Text>}
      {attachments.length > 0 && (
        <View style={styles.attachments}>
          {attachments.map((id) => (
            <AttachmentItem key={id} fileId={id} isOwn={isOwn} />
          ))}
        </View>
      )}
      {content ? (
        <Text style={[styles.content, isOwn ? styles.contentOwn : styles.contentOther]}>
          {content}
        </Text>
      ) : null}
      <View style={styles.meta}>
        {isEdited && (
          <Text style={[styles.edited, isOwn ? styles.metaOwn : styles.metaOther]}>
            edited
          </Text>
        )}
        {time ? (
          <Text style={[styles.time, isOwn ? styles.metaOwn : styles.metaOther]}>
            {time}
          </Text>
        ) : null}
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
  wrapper: { paddingHorizontal: 12, marginVertical: 2 },
  wrapperOwn: { alignItems: 'flex-end' },
  wrapperOther: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  bubbleOwn: { backgroundColor: '#4F46E5', borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: '#F3F4F6', borderBottomLeftRadius: 4 },
  senderName: { fontSize: 12, fontWeight: '600', color: '#4F46E5', marginBottom: 2 },
  content: { fontSize: 15, lineHeight: 20 },
  contentOwn: { color: '#FFFFFF' },
  contentOther: { color: '#111827' },
  attachments: { gap: 6, marginBottom: 6 },
  meta: { flexDirection: 'row', justifyContent: 'flex-end', gap: 4, marginTop: 2 },
  time: { fontSize: 11 },
  metaOwn: { color: 'rgba(255, 255, 255, 0.7)' },
  metaOther: { color: '#9CA3AF' },
  edited: { fontSize: 11, fontStyle: 'italic' },
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
  threadBtnOther: { borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  threadBtnText: { fontSize: 12, fontWeight: '600', color: '#4F46E5' },
});

const attachStyles = StyleSheet.create({
  skeleton: {
    width: 200,
    height: 48,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeletonText: { fontSize: 12, opacity: 0.6 },
  image: { width: 220, height: 220, borderRadius: 8, resizeMode: 'cover' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: 6,
    minWidth: 180,
  },
  cardOwn: { backgroundColor: 'rgba(255,255,255,0.18)' },
  cardOther: { backgroundColor: 'rgba(0,0,0,0.06)' },
  icon: { fontSize: 18 },
  info: { flex: 1 },
  name: { fontSize: 13, fontWeight: '500', color: '#111827' },
  nameOwn: { color: '#FFFFFF' },
  meta: { fontSize: 11, color: '#6B7280' },
  metaOwn: { color: 'rgba(255,255,255,0.75)' },
});
