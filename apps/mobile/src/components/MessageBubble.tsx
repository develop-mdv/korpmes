import React, { memo, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useFileStore } from '../stores/file.store';
import { useTheme } from '../theme';

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
  const theme = useTheme();
  const fetchFile = useFileStore((s) => s.fetchFile);
  const file = useFileStore((s) => s.filesById[fileId]);

  useEffect(() => {
    if (!file) void fetchFile(fileId);
  }, [fileId, file, fetchFile]);

  if (!file) {
    return (
      <View style={[attachStyles.skeleton, { backgroundColor: theme.colors.surfaceSoft }]}>
        <Text style={[attachStyles.skeletonText, { color: theme.colors.textSecondary }]}>Загружается…</Text>
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

  const cardBg = isOwn ? 'rgba(255,255,255,0.16)' : theme.colors.surfaceSoft;
  const nameColor = isOwn ? theme.colors.onPrimary : theme.colors.textPrimary;
  const metaColor = isOwn ? 'rgba(255,255,255,0.78)' : theme.colors.textTertiary;
  const iconColor = isOwn ? theme.colors.onPrimary : theme.colors.primary;

  return (
    <TouchableOpacity style={[attachStyles.card, { backgroundColor: cardBg }]} onPress={openUrl} activeOpacity={0.85}>
      <Ionicons name="document-attach-outline" size={20} color={iconColor} />
      <View style={attachStyles.info}>
        <Text numberOfLines={1} style={[attachStyles.name, { color: nameColor }]}>
          {file.originalName}
        </Text>
        <Text style={[attachStyles.meta, { color: metaColor }]}>{formatSize(file.sizeBytes)}</Text>
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
  const theme = useTheme();
  const parsedDate = new Date(createdAt);
  const time = Number.isNaN(parsedDate.getTime()) ? '' : format(parsedDate, 'HH:mm');
  const hasThread = (replyCount ?? 0) > 0 || onOpenThread !== undefined;

  const ownBubble = { backgroundColor: theme.colors.primary, borderBottomRightRadius: 8 };
  const otherBubble = {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderBottomLeftRadius: 8,
  };
  const ownText = { color: theme.colors.onPrimary };
  const otherText = { color: theme.colors.textPrimary };
  const ownMeta = { color: 'rgba(255,255,255,0.78)' };
  const otherMeta = { color: theme.colors.textTertiary };

  const bubbleContent = (
    <View style={[styles.bubble, isOwn ? ownBubble : otherBubble]}>
      {showSender && !isOwn && (
        <Text style={[styles.senderName, { color: theme.colors.primary }]}>{senderName}</Text>
      )}
      {attachments.length > 0 && (
        <View style={styles.attachments}>
          {attachments.map((id) => (
            <AttachmentItem key={id} fileId={id} isOwn={isOwn} />
          ))}
        </View>
      )}
      {content ? <Text style={[styles.content, isOwn ? ownText : otherText]}>{content}</Text> : null}
      <View style={styles.meta}>
        {isEdited && (
          <Text style={[styles.edited, isOwn ? ownMeta : otherMeta]}>изменено</Text>
        )}
        {time ? <Text style={[styles.time, isOwn ? ownMeta : otherMeta]}>{time}</Text> : null}
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
          style={[
            styles.threadBtn,
            { borderColor: theme.colors.borderStrong, backgroundColor: theme.colors.surfaceSoft },
          ]}
          onPress={onOpenThread}
          activeOpacity={0.7}
        >
          <Text style={[styles.threadBtnText, { color: theme.colors.primary }]}>
            {replyCount} {replyCount === 1 ? 'ответ' : 'ответа'} →
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { paddingHorizontal: 12, marginVertical: 3 },
  wrapperOwn: { alignItems: 'flex-end' },
  wrapperOther: { alignItems: 'flex-start' },
  bubble: { maxWidth: '82%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9 },
  senderName: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  content: { fontSize: 15, lineHeight: 20 },
  attachments: { gap: 6, marginBottom: 6 },
  meta: { flexDirection: 'row', justifyContent: 'flex-end', gap: 6, marginTop: 4 },
  time: { fontSize: 11 },
  edited: { fontSize: 11, fontStyle: 'italic' },
  threadBtn: { marginTop: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  threadBtnText: { fontSize: 12, fontWeight: '600' },
});

const attachStyles = StyleSheet.create({
  skeleton: { width: 200, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  skeletonText: { fontSize: 12, opacity: 0.7 },
  image: { width: 220, height: 220, borderRadius: 14, resizeMode: 'cover' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 14, minWidth: 180 },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 13, fontWeight: '600' },
  meta: { fontSize: 11 },
});
