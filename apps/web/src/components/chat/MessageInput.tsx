import {
  ChangeEvent,
  CSSProperties,
  DragEvent,
  KeyboardEvent,
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { StagedFile } from '@/hooks/useAttachmentStaging';
import { useVoiceRecorder, type VoiceRecording } from '@/hooks/useVoiceRecorder';
import type { VideoNoteRecording } from '@/hooks/useVideoNoteRecorder';
import { RecordingBar } from './RecordingBar';
import { VideoNoteRecorderOverlay } from './VideoNoteRecorderOverlay';

interface MessageInputProps {
  onSend: (content: string) => void;
  onTyping?: () => void;
  onAttach?: (files: FileList) => void;
  onSendVoice?: (rec: VoiceRecording) => void;
  onSendVideoNote?: (rec: VideoNoteRecording) => void;
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
  onSendVoice,
  onSendVideoNote,
  stagedFiles = [],
  onRemoveStaged,
  disabled = false,
  disableSend = false,
}: MessageInputProps) {
  const [text, setText] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [showVideoNote, setShowVideoNote] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pressOriginRef = useRef<{ x: number; y: number } | null>(null);

  const recorder = useVoiceRecorder({
    onComplete: (rec) => {
      onSendVoice?.(rec);
    },
    onError: (err) => {
      console.warn('Voice recorder error:', err);
    },
  });

  const isRecording = recorder.state === 'recording' || recorder.state === 'locked';

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
    const files = event.dataTransfer?.types?.includes('Files') ? event.dataTransfer.files : null;
    if (files && files.length > 0) onAttach(files);
  };

  const handleMicPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!onSendVoice) return;
    e.preventDefault();
    pressOriginRef.current = { x: e.clientX, y: e.clientY };
    recorder.start();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  };

  const handleMicPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!isRecording || recorder.state === 'locked' || !pressOriginRef.current) return;
    const dx = e.clientX - pressOriginRef.current.x;
    const dy = e.clientY - pressOriginRef.current.y;
    if (dx < -80) {
      recorder.cancel();
      pressOriginRef.current = null;
      return;
    }
    if (dy < -50) {
      recorder.lock();
      pressOriginRef.current = null;
    }
  };

  const handleMicPointerUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (recorder.state === 'recording') {
      recorder.stop();
    }
    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
    pressOriginRef.current = null;
  };

  return (
    <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} style={{ position: 'relative' }}>
      {isDragOver && (
        <div style={stagedStyles.dropOverlay}>
          <span>📎 Отпустите, чтобы прикрепить (до 10 файлов)</span>
        </div>
      )}
      {stagedFiles.length > 0 && !isRecording && (
        <div style={stagedStyles.strip}>
          {stagedFiles.map((s) => (
            <StagedAttachment key={s.localId} item={s} onRemove={() => onRemoveStaged?.(s.localId)} />
          ))}
        </div>
      )}

      {isRecording ? (
        <RecordingBar
          state={recorder.state}
          elapsedMs={recorder.elapsedMs}
          amplitude={recorder.amplitude}
          onCancel={recorder.cancel}
          onSend={recorder.stop}
          onLock={recorder.lock}
        />
      ) : (
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

          {onSendVideoNote && !canSend && (
            <button
              className="composer__attach"
              onClick={() => setShowVideoNote(true)}
              title="Записать кружок"
              disabled={disabled}
              style={{ marginLeft: 4 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <circle cx="12" cy="12" r="4" fill="currentColor" />
              </svg>
            </button>
          )}

          {onSendVoice && !canSend ? (
            <button
              className="composer__send"
              onPointerDown={handleMicPointerDown}
              onPointerMove={handleMicPointerMove}
              onPointerUp={handleMicPointerUp}
              onPointerCancel={handleMicPointerUp}
              title="Удерживайте, чтобы записать"
              disabled={disabled}
              style={{ touchAction: 'none' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3z" />
                <path d="M19 11a1 1 0 0 0-2 0 5 5 0 0 1-10 0 1 1 0 0 0-2 0 7 7 0 0 0 6 6.92V20H8a1 1 0 0 0 0 2h8a1 1 0 0 0 0-2h-3v-2.08A7 7 0 0 0 19 11z" />
              </svg>
            </button>
          ) : (
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
          )}
        </div>
      )}

      <VideoNoteRecorderOverlay
        open={showVideoNote}
        onClose={() => setShowVideoNote(false)}
        onRecorded={(rec) => {
          onSendVideoNote?.(rec);
        }}
      />
    </div>
  );
}
