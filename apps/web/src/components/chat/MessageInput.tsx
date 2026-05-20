import {
  ChangeEvent,
  CSSProperties,
  DragEvent,
  KeyboardEvent,
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { getChatCommandSuggestions } from '@corp/shared-constants';
import type { ChatCommandSuggestion } from '@corp/shared-constants';
import type { StagedFile } from '@/hooks/useAttachmentStaging';
import type { FileDisplayMode } from '@/api/files.api';
import { useVoiceRecorder, type VoiceRecording } from '@/hooks/useVoiceRecorder';
import type { VideoNoteRecording } from '@/hooks/useVideoNoteRecorder';
import { RecordingBar } from './RecordingBar';
import { VideoNoteRecorderOverlay } from './VideoNoteRecorderOverlay';

interface MessageInputProps {
  onSend: (content: string) => boolean | void | Promise<boolean | void>;
  onTyping?: () => void;
  onAttach?: (files: FileList, mode: FileDisplayMode) => void;
  onSendVoice?: (rec: VoiceRecording) => void;
  onSendVideoNote?: (rec: VideoNoteRecording) => void;
  stagedFiles?: StagedFile[];
  onRemoveStaged?: (localId: string) => void;
  disabled?: boolean;
  disableSend?: boolean;
  feedback?: ComposerFeedback | null;
}

interface ComposerFeedback {
  tone: 'success' | 'error' | 'info';
  message: string;
  actionLabel?: string;
  onAction?: () => void;
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
  badge: {
    display: 'inline-block',
    padding: '0 6px',
    borderRadius: 6,
    fontSize: 10,
    fontWeight: 600,
    background: 'var(--color-primary-faint)',
    color: 'var(--color-primary-dark)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  attachMenu: {
    position: 'absolute',
    bottom: 'calc(100% + 8px)',
    left: 0,
    minWidth: 180,
    padding: 6,
    background: 'var(--color-surface-strong)',
    border: '1px solid var(--color-border)',
    borderRadius: 12,
    boxShadow: 'var(--shadow-lg)',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    zIndex: 30,
  },
  attachMenuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 10px',
    border: 'none',
    background: 'transparent',
    color: 'var(--color-text-primary)',
    borderRadius: 8,
    cursor: 'pointer',
    textAlign: 'left' as const,
    fontSize: 13,
    width: '100%',
  },
  attachMenuItemActive: {
    background: 'var(--color-surface-soft)',
  },
  attachWrap: {
    position: 'relative',
    display: 'inline-flex',
  },
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
  commandMenu: {
    margin: '0 18px 8px',
    padding: 6,
    background: 'var(--color-surface-strong)',
    border: '1px solid var(--color-border)',
    borderRadius: 12,
    boxShadow: 'var(--shadow-md)',
  },
  commandButton: {
    width: '100%',
    display: 'grid',
    gridTemplateColumns: '80px minmax(0, 1fr)',
    alignItems: 'center',
    gap: 10,
    padding: '9px 10px',
    border: 'none',
    borderRadius: 8,
    background: 'transparent',
    color: 'var(--color-text-primary)',
    cursor: 'pointer',
    textAlign: 'left' as const,
  },
  commandName: {
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: 800,
    color: 'var(--color-primary)',
  },
  commandTitle: {
    display: 'block',
    fontSize: 13,
    fontWeight: 800,
    color: 'var(--color-text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  commandDescription: {
    display: 'block',
    fontSize: 12,
    color: 'var(--color-text-secondary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  feedback: {
    margin: '0 18px 8px',
    padding: '8px 10px',
    borderRadius: 10,
    border: '1px solid',
    fontSize: 13,
    fontWeight: 700,
  },
  feedbackAction: {
    marginLeft: 12,
    color: 'inherit',
    opacity: 0.8,
    textDecoration: 'underline',
    whiteSpace: 'nowrap',
  },
};

function StagedAttachment({ item, onRemove }: { item: StagedFile; onRemove: () => void }) {
  const isImage = item.file.type.startsWith('image/');
  const isVideo = item.file.type.startsWith('video/');
  const showMediaPreview = item.displayMode === 'media' && (isImage || isVideo);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!showMediaPreview) return;
    const url = URL.createObjectURL(item.file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [item.file, showMediaPreview]);

  const badgeText = item.displayMode === 'media' ? 'Медиа' : 'Файл';

  return (
    <div style={stagedStyles.item}>
      {showMediaPreview && previewUrl ? (
        isVideo ? (
          <video src={previewUrl} muted preload="metadata" style={stagedStyles.thumb} />
        ) : (
          <img src={previewUrl} alt={item.file.name} style={stagedStyles.thumb} />
        )
      ) : (
        <div style={stagedStyles.fileIcon}>📄</div>
      )}
      <div style={stagedStyles.info}>
        <div style={stagedStyles.name} title={item.file.name}>
          {item.file.name}
        </div>
        <div style={stagedStyles.meta}>
          <span style={stagedStyles.badge}>{badgeText}</span>
          {' · '}
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
  feedback = null,
}: MessageInputProps) {
  const [text, setText] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [showVideoNote, setShowVideoNote] = useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [attachMenuFocus, setAttachMenuFocus] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingModeRef = useRef<FileDisplayMode>('file');
  const attachWrapRef = useRef<HTMLDivElement>(null);
  const pressOriginRef = useRef<{ x: number; y: number } | null>(null);
  const commandSuggestions = useMemo(() => getChatCommandSuggestions(text), [text]);

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

  const handleSend = useCallback(async () => {
    if (!canSend) return;
    const result = await onSend(text.trim());
    if (result === false) return;
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

  const chooseCommand = (command: ChatCommandSuggestion) => {
    const value = `${command.command} `;
    resizeInput(value);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(value.length, value.length);
    });
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      onAttach?.(event.target.files, pendingModeRef.current);
      event.target.value = '';
    }
  };

  const inferModeFromFiles = (files: FileList): FileDisplayMode => {
    const first = files.item(0);
    if (!first) return 'file';
    return first.type.startsWith('image/') || first.type.startsWith('video/')
      ? 'media'
      : 'file';
  };

  const openAttachInput = (mode: FileDisplayMode) => {
    pendingModeRef.current = mode;
    setAttachMenuOpen(false);
    if (mode === 'media') {
      mediaInputRef.current?.click();
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleAttachKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!attachMenuOpen) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      setAttachMenuOpen(false);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setAttachMenuFocus((i) => (i + 1) % 2);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setAttachMenuFocus((i) => (i + 1) % 2);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      openAttachInput(attachMenuFocus === 0 ? 'media' : 'file');
    }
  };

  useEffect(() => {
    if (!attachMenuOpen) return;
    const handler = (event: MouseEvent) => {
      if (!attachWrapRef.current) return;
      if (!attachWrapRef.current.contains(event.target as Node)) {
        setAttachMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [attachMenuOpen]);

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
    if (files && files.length > 0) onAttach(files, inferModeFromFiles(files));
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
        <>
          {commandSuggestions.length > 0 && (
            <div style={stagedStyles.commandMenu}>
              {commandSuggestions.map((command) => (
                <button
                  key={command.name}
                  type="button"
                  style={stagedStyles.commandButton}
                  onClick={() => chooseCommand(command)}
                  title={command.usage}
                >
                  <span style={stagedStyles.commandName}>{command.command}</span>
                  <span style={{ minWidth: 0 }}>
                    <span style={stagedStyles.commandTitle}>{command.title}</span>
                    <span style={stagedStyles.commandDescription}>{command.description}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
          {feedback &&
            (() => {
              const feedbackStyle: CSSProperties = {
                ...stagedStyles.feedback,
                color:
                  feedback.tone === 'success'
                    ? '#24744f'
                    : feedback.tone === 'error'
                      ? '#9a3737'
                      : 'var(--color-text-secondary)',
                borderColor:
                  feedback.tone === 'success'
                    ? 'rgba(42, 153, 101, 0.22)'
                    : feedback.tone === 'error'
                      ? 'rgba(201, 78, 78, 0.2)'
                      : 'var(--color-border)',
                background:
                  feedback.tone === 'success'
                    ? 'rgba(42, 153, 101, 0.13)'
                    : feedback.tone === 'error'
                      ? 'rgba(201, 78, 78, 0.12)'
                      : 'var(--color-surface-soft)',
              };

              if (!feedback.onAction) {
                return <div style={feedbackStyle}>{feedback.message}</div>;
              }

              return (
                <button
                  type="button"
                  onClick={feedback.onAction}
                  style={{
                    ...feedbackStyle,
                    width: 'calc(100% - 36px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <span>{feedback.message}</span>
                  <span style={stagedStyles.feedbackAction}>{feedback.actionLabel ?? 'Открыть'}</span>
                </button>
              );
            })()}
          <div className="composer">
            <div ref={attachWrapRef} style={stagedStyles.attachWrap} onKeyDown={handleAttachKeyDown}>
              <button
                className="composer__attach"
                onClick={() => {
                  if (!onAttach) return;
                  setAttachMenuFocus(0);
                  setAttachMenuOpen((v) => !v);
                }}
                title="Прикрепить"
                disabled={!onAttach}
                aria-haspopup="menu"
                aria-expanded={attachMenuOpen}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              </button>
              {attachMenuOpen && (
                <div role="menu" style={stagedStyles.attachMenu}>
                  <button
                    type="button"
                    role="menuitem"
                    style={{
                      ...stagedStyles.attachMenuItem,
                      ...(attachMenuFocus === 0 ? stagedStyles.attachMenuItemActive : {}),
                    }}
                    onMouseEnter={() => setAttachMenuFocus(0)}
                    onClick={() => openAttachInput('media')}
                  >
                    <span aria-hidden="true">🖼️</span>
                    <span>Фото / видео</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    style={{
                      ...stagedStyles.attachMenuItem,
                      ...(attachMenuFocus === 1 ? stagedStyles.attachMenuItemActive : {}),
                    }}
                    onMouseEnter={() => setAttachMenuFocus(1)}
                    onClick={() => openAttachInput('file')}
                  >
                    <span aria-hidden="true">📎</span>
                    <span>Файл</span>
                  </button>
                </div>
              )}
            </div>

          <input
            ref={mediaInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
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
        </>
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
