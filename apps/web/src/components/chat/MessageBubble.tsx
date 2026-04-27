import React, { useEffect, useState } from 'react';
import { Avatar } from '@/components/common/Avatar';
import { useFileStore, type CachedFile } from '@/stores/file.store';
import { FilePreviewModal } from '@/components/files/FilePreviewModal';
import { useBreakpoint } from '@/hooks/useBreakpoint';

interface MessageBubbleProps {
  message: {
    id: string;
    content?: string;
    senderId: string;
    senderName?: string;
    type: string;
    isEdited: boolean;
    createdAt: string;
    reactions?: { emoji: string; userId: string }[];
    attachments?: string[];
  };
  isOwn: boolean;
  showSender: boolean;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function AttachmentItem({
  fileId,
  onPreview,
}: {
  fileId: string;
  onPreview: (file: CachedFile) => void;
}) {
  const fetchFile = useFileStore((s) => s.fetchFile);
  const file = useFileStore((s) => s.filesById[fileId]);

  useEffect(() => {
    if (!file) void fetchFile(fileId);
  }, [fileId, file, fetchFile]);

  if (!file) {
    return <div style={attachStyles.skeleton}>Loading…</div>;
  }

  const isImage = file.mimeType.startsWith('image/');
  const isVideo = file.mimeType.startsWith('video/');
  const previewSrc = file.thumbnailUrl || file.signedUrl;

  if (isImage && previewSrc) {
    return (
      <img
        src={previewSrc}
        alt={file.originalName}
        style={{ ...attachStyles.image, maxWidth: 'min(240px, 70vw)' }}
        onClick={() => onPreview(file)}
      />
    );
  }

  return (
    <div style={{ ...attachStyles.card, minWidth: 0, maxWidth: 'min(260px, 70vw)' }} onClick={() => onPreview(file)}>
      <div style={attachStyles.icon}>{isVideo ? '🎬' : '📎'}</div>
      <div style={attachStyles.info}>
        <div style={attachStyles.name} title={file.originalName}>
          {file.originalName}
        </div>
        <div style={attachStyles.meta}>{formatSize(file.sizeBytes)}</div>
      </div>
    </div>
  );
}

export function MessageBubble({ message, isOwn, showSender }: MessageBubbleProps) {
  const time = new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const [preview, setPreview] = useState<CachedFile | null>(null);
  const attachments = message.attachments ?? [];
  const { isMobile } = useBreakpoint();

  const wrapperStyle: React.CSSProperties = {
    ...styles.wrapper,
    justifyContent: isOwn ? 'flex-end' : 'flex-start',
    padding: isMobile ? '0 4px' : '0 16px',
  };
  const bubbleStyle: React.CSSProperties = {
    ...styles.bubble,
    ...(isOwn ? styles.ownBubble : styles.otherBubble),
    maxWidth: isMobile ? '82%' : '65%',
  };

  return (
    <div style={wrapperStyle}>
      {!isOwn && showSender && <Avatar name={message.senderName || '?'} size="sm" />}
      <div style={bubbleStyle}>
        {!isOwn && showSender && <div style={styles.senderName}>{message.senderName}</div>}
        {attachments.length > 0 && (
          <div style={styles.attachments}>
            {attachments.map((id) => (
              <AttachmentItem key={id} fileId={id} onPreview={setPreview} />
            ))}
          </div>
        )}
        {message.content && <div style={styles.content}>{message.content}</div>}
        <div style={styles.meta}>
          {message.isEdited && <span style={styles.edited}>edited</span>}
          <span style={styles.time}>{time}</span>
        </div>
        {message.reactions && message.reactions.length > 0 && (
          <div style={styles.reactions}>
            {message.reactions.map((r) => (
              <span key={`${r.emoji}-${r.userId}`} style={styles.reaction}>
                {r.emoji}
              </span>
            ))}
          </div>
        )}
      </div>
      {preview && preview.signedUrl && (
        <FilePreviewModal
          file={{
            id: preview.id,
            originalName: preview.originalName,
            mimeType: preview.mimeType,
            sizeBytes: preview.sizeBytes,
          }}
          signedUrl={preview.signedUrl}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 4, padding: '0 16px' },
  bubble: { maxWidth: '65%', padding: '8px 12px', borderRadius: 12, fontSize: 14, lineHeight: 1.5 },
  ownBubble: { background: 'var(--color-primary)', color: '#fff', borderBottomRightRadius: 4 },
  otherBubble: { background: 'var(--color-bg-tertiary)', color: 'var(--color-text)', borderBottomLeftRadius: 4 },
  senderName: { fontSize: 12, fontWeight: 600, color: 'var(--color-primary)', marginBottom: 2 },
  content: { wordBreak: 'break-word', whiteSpace: 'pre-wrap' },
  attachments: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 6 },
  meta: { display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 4 },
  edited: { fontSize: 11, opacity: 0.7 },
  time: { fontSize: 11, opacity: 0.7 },
  reactions: { display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' },
  reaction: { fontSize: 12, padding: '2px 6px', borderRadius: 10, background: 'rgba(0,0,0,0.08)', cursor: 'pointer' },
};

const attachStyles: Record<string, React.CSSProperties> = {
  skeleton: { width: 220, height: 48, borderRadius: 6, background: 'rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, opacity: 0.6 },
  image: { maxWidth: 240, maxHeight: 240, borderRadius: 6, cursor: 'pointer', objectFit: 'cover' },
  card: { display: 'flex', alignItems: 'center', gap: 8, padding: 8, background: 'rgba(0,0,0,0.08)', borderRadius: 6, cursor: 'pointer', minWidth: 200 },
  icon: { width: 32, height: 32, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.08)', fontSize: 18 },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  meta: { fontSize: 11, opacity: 0.75 },
};
