import React, { useState, useRef, useCallback, KeyboardEvent } from 'react';
import type { StagedFile } from '@/hooks/useAttachmentStaging';
import { useBreakpoint } from '@/hooks/useBreakpoint';

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

function StagedAttachment({
  item,
  onRemove,
}: {
  item: StagedFile;
  onRemove: () => void;
}) {
  const isImage = item.file.type.startsWith('image/');
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
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
      <button style={stagedStyles.removeBtn} onClick={onRemove} title="Remove">
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
  disabled,
  disableSend,
}: MessageInputProps) {
  const [text, setText] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isMobile } = useBreakpoint();

  const containerStyle: React.CSSProperties = isMobile
    ? { ...styles.container, padding: '10px 10px' }
    : styles.container;
  const attachBtnStyle: React.CSSProperties = isMobile
    ? { ...styles.attachBtn, width: 40, height: 40 }
    : styles.attachBtn;
  const sendBtnStyle: React.CSSProperties = isMobile
    ? { ...styles.sendBtn, width: 40, height: 40 }
    : styles.sendBtn;

  const hasReadyFiles = stagedFiles.some((s) => s.status === 'done');
  const canSend = !disableSend && (text.trim().length > 0 || hasReadyFiles);

  const handleSend = useCallback(() => {
    if (!canSend) return;
    onSend(text.trim());
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [text, onSend, canSend]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (value: string) => {
    setText(value);
    onTyping?.();
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  };

  const handleFileClick = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAttach?.(e.target.files);
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!onAttach) return;
    if (!e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDragOver) setIsDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    if (!onAttach) return;
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) onAttach(files);
  };

  return (
    <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} style={{ position: 'relative' }}>
      {isDragOver && !isMobile && (
        <div style={stagedStyles.dropOverlay}>
          <span>📎 Drop files to attach (up to 10)</span>
        </div>
      )}
      {stagedFiles.length > 0 && (
        <div style={stagedStyles.strip}>
          {stagedFiles.map((s) => (
            <StagedAttachment
              key={s.localId}
              item={s}
              onRemove={() => onRemoveStaged?.(s.localId)}
            />
          ))}
        </div>
      )}
      <div style={containerStyle}>
        <button style={attachBtnStyle} onClick={handleFileClick} title="Attach file">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
          </svg>
        </button>
        <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleFileChange} />
        <textarea
          ref={textareaRef}
          style={styles.textarea}
          value={text}
          onChange={(e) => handleInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          disabled={disabled}
        />
        <button
          style={{ ...sendBtnStyle, opacity: canSend ? 1 : 0.4 }}
          onClick={handleSend}
          disabled={!canSend || disabled}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', alignItems: 'flex-end', gap: 8, padding: '12px 16px', background: 'var(--color-surface)' },
  attachBtn: { width: 36, height: 36, borderRadius: 'var(--radius-md)', border: 'none', background: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  textarea: { flex: 1, resize: 'none', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', lineHeight: 1.5, maxHeight: 120, outline: 'none', color: 'var(--color-text)', background: 'var(--color-bg-secondary)' },
  sendBtn: { width: 36, height: 36, borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--color-primary)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
};

const stagedStyles: Record<string, React.CSSProperties> = {
  strip: { display: 'flex', flexWrap: 'wrap', gap: 8, padding: '8px 16px', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' },
  item: { display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-bg-tertiary)', borderRadius: 8, padding: 6, maxWidth: 260, minWidth: 180, position: 'relative' },
  thumb: { width: 40, height: 40, objectFit: 'cover', borderRadius: 4, flexShrink: 0 },
  fileIcon: { width: 40, height: 40, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-secondary)', fontSize: 20, flexShrink: 0 },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 12, fontWeight: 500, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  meta: { fontSize: 11, color: 'var(--color-text-secondary)' },
  progressBar: { height: 3, background: 'var(--color-border)', borderRadius: 2, marginTop: 4, overflow: 'hidden' },
  progressFill: { height: '100%', background: 'var(--color-primary)', transition: 'width 0.15s' },
  removeBtn: { width: 20, height: 20, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.12)', color: 'var(--color-text)', cursor: 'pointer', fontSize: 12, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  dropOverlay: {
    position: 'absolute', inset: 0, zIndex: 20, display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    background: 'rgba(79, 70, 229, 0.12)',
    border: '2px dashed var(--color-primary)', borderRadius: 8,
    color: 'var(--color-primary)', fontSize: 14, fontWeight: 600,
    pointerEvents: 'none',
  },
};
