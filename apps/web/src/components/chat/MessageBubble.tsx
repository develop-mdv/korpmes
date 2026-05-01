import { CSSProperties, useEffect, useState } from 'react';
import clsx from 'clsx';
import { Avatar } from '@/components/common/Avatar';
import { useFileStore, type CachedFile } from '@/stores/file.store';
import { FilePreviewModal } from '@/components/files/FilePreviewModal';

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

const attachStyles: Record<string, CSSProperties> = {
  skeleton: {
    width: 220,
    height: 48,
    borderRadius: 12,
    background: 'rgba(255,255,255,0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    opacity: 0.6,
  },
  image: { maxWidth: 'min(260px, 70vw)', maxHeight: 280, borderRadius: 14, cursor: 'pointer', objectFit: 'cover' },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    background: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    cursor: 'pointer',
    minWidth: 0,
    maxWidth: 'min(260px, 70vw)',
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255,255,255,0.08)',
    fontSize: 18,
    flexShrink: 0,
  },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  meta: { fontSize: 11, opacity: 0.75 },
};

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
    return <div style={attachStyles.skeleton}>Загружается…</div>;
  }

  const isImage = file.mimeType.startsWith('image/');
  const isVideo = file.mimeType.startsWith('video/');
  const previewSrc = file.thumbnailUrl || file.signedUrl;

  if (isImage && previewSrc) {
    return <img src={previewSrc} alt={file.originalName} style={attachStyles.image} onClick={() => onPreview(file)} />;
  }

  return (
    <div style={attachStyles.card} onClick={() => onPreview(file)}>
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
  const time = new Date(message.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const [preview, setPreview] = useState<CachedFile | null>(null);
  const attachments = message.attachments ?? [];

  return (
    <div className={clsx('message-row', isOwn && 'message-row--own')}>
      {!isOwn && showSender && <Avatar name={message.senderName || '?'} size="sm" />}
      <div className={clsx('message-row__bubble', isOwn && 'message-row__bubble--own')}>
        {!isOwn && showSender && <div className="message-row__sender">{message.senderName}</div>}
        {attachments.length > 0 && (
          <div className="message-row__attachments">
            {attachments.map((id) => (
              <AttachmentItem key={id} fileId={id} onPreview={setPreview} />
            ))}
          </div>
        )}
        {message.content && <div className="message-row__content">{message.content}</div>}
        <div className="message-row__meta">
          {message.isEdited && <span>изменено</span>}
          <span>{time}</span>
        </div>
        {message.reactions && message.reactions.length > 0 && (
          <div className="message-row__reactions">
            {message.reactions.map((reaction) => (
              <span key={`${reaction.emoji}-${reaction.userId}`} className="message-row__reaction">
                {reaction.emoji}
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
