import {
  ChangeEvent,
  CSSProperties,
  DragEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { StagedFile } from '@/hooks/useAttachmentStaging';

interface MessageInputProps {
  onSend: (content: string) => void;
  onTyping?: () => void;
  onAttach?: (files: FileList) => void;
  stagedFiles?: StagedFile[];
  onRemoveStaged?: (localId: string) => void;
  disabled?: boolean;
  disableSend?: boolean;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const stagedStyles: Record<string, CSSProperties> = {
  strip: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    padding: '10px 18px',
    background: 'var(--color-surface-soft)',
    borderTop: '1px solid var(--color-border)',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'var(--color-surface-strong)',
    borderRadius: 14,
    padding: 8,
    maxWidth: 260,
    minWidth: 180,
    position: 'relative',
  },
  thumb: { width: 40, height: 40, objectFit: 'cover', borderRadius: 8, flexShrink: 0 },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255,255,255,0.06)',
    fontSize: 20,
    flexShrink: 0,
  },
  info: { flex: 1, minWidth: 0 },
  name: {
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--color-text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  meta: { fontSize: 11, color: 'var(--color-text-secondary)' },
  progressBar: {
    height: 3,
    background: 'var(--color-border)',
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', background: 'var(--color-primary)', transition: 'width 0.15s' },
  removeBtn: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(0,0,0,0.12)',
    color: 'var(--color-text-primary)',
    cursor: 'pointer',
    fontSize: 12,
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dropOverlay: {
    position: 'absolute',
    inset: 0,
    zIndex: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(159, 122, 61, 0.12)',
    border: '2px dashed var(--color-primary)',
    borderRadius: 18,
    color: 'var(--color-primary)',
    fontSize: 14,
    fontWeight: 600,
    pointerEvents: 'none',
  },
};

function StagedAttachment({ item, onRemove }: { item: StagedFile; onRemove: () => void }) {
  const isImage = item.file.type.startsWith('image/');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isImage) return;
    const url = URL.createObjectURL(item.file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [item.file, isImage]);

  return (
    <div style={stagedStyles.item}>
      {isImage && previewUrl ? (
        <img src={previewUrl} alt={item.file.name} style={stagedStyles.thumb} />
      ) : (
        <div style={stagedStyles.fileIcon}>📄</div>
      )}
      <div style={stagedStyles.info}>
        <div style={stagedStyles.name} title={item.file.name}>
          {item.file.name}
        </div>
        <div style={stagedStyles.meta}>
          {formatSize(item.file.size)}
          {item.status === 'uploading' && ` · ${item.progress}%`}
          {item.status === 'error' && ` · ${item.error}`}
        </div>
        {item.status === 'uploading' && (
          <div style={stagedStyles.progressBar}>
            <div style={{ ...stagedStyles.progressFill, width: `${item.progress}%` }} />
          </div>
        )}
      </div>
      <button style={stagedStyles.removeBtn} onClick={onRemove} title="Убрать">
        ✕
      </button>
    </div>
  );
}

export function MessageInput({
  onSend,
  onTyping,
  onAttach,
  stagedFiles = [],
  onRemoveStaged,
  disabled = false,
  disableSend = false,
}: MessageInputProps) {
  const [text, setText] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasReadyFiles = stagedFiles.some((s) => s.status === 'done');
  const canSend = !disableSend && (text.trim().length > 0 || hasReadyFiles);

  const handleSend = useCallback(() => {
    if (!canSend) return;
    onSend(text.trim());
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '48px';
    }
  }, [canSend, onSend, text]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const resizeInput = (value: string) => {
    setText(value);
    onTyping?.();
    if (!textareaRef.current) return;
    textareaRef.current.style.height = '48px';
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      onAttach?.(event.target.files);
      event.target.value = '';
    }
  };

  const handleDragOver = (event: DragEvent) => {
    if (!onAttach) return;
    if (!event.dataTransfer?.types?.includes('Files')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    if (!isDragOver) setIsDragOver(true);
  };
  const handleDragLeave = (event: DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };
  const handleDrop = (event: DragEvent) => {
    if (!onAttach) return;
    event.preventDefault();
    setIsDragOver(false);
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) onAttach(files);
  };

  return (
    <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} style={{ position: 'relative' }}>
      {isDragOver && (
        <div style={stagedStyles.dropOverlay}>
          <span>📎 Отпустите, чтобы прикрепить (до 10 файлов)</span>
        </div>
      )}
      {stagedFiles.length > 0 && (
        <div style={stagedStyles.strip}>
          {stagedFiles.map((s) => (
            <StagedAttachment key={s.localId} item={s} onRemove={() => onRemoveStaged?.(s.localId)} />
          ))}
        </div>
      )}
      <div className="composer">
        <button
          className="composer__attach"
          onClick={() => fileInputRef.current?.click()}
          title="Прикрепить файл"
          disabled={!onAttach}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        <textarea
          ref={textareaRef}
          className="composer__input"
          value={text}
          rows={1}
          placeholder="Напишите сообщение..."
          disabled={disabled}
          onChange={(event) => resizeInput(event.target.value)}
          onKeyDown={handleKeyDown}
        />

        <button
          className="composer__send"
          onClick={handleSend}
          disabled={!canSend || disabled}
          title="Отправить"
          style={{ opacity: canSend ? 1 : 0.5 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
