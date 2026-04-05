import React, { useState, useRef, useCallback, KeyboardEvent } from 'react';

interface MessageInputProps {
  onSend: (content: string) => void;
  onTyping?: () => void;
  onAttach?: (files: FileList) => void;
  disabled?: boolean;
}

export function MessageInput({ onSend, onTyping, onAttach, disabled }: MessageInputProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [text, onSend]);

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

  return (
    <div style={styles.container}>
      <button style={styles.attachBtn} onClick={handleFileClick} title="Attach file">
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
        style={{ ...styles.sendBtn, opacity: text.trim() ? 1 : 0.4 }}
        onClick={handleSend}
        disabled={!text.trim() || disabled}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
        </svg>
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', alignItems: 'flex-end', gap: 8, padding: '12px 16px', background: 'var(--color-surface)' },
  attachBtn: { width: 36, height: 36, borderRadius: 'var(--radius-md)', border: 'none', background: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  textarea: { flex: 1, resize: 'none', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', lineHeight: 1.5, maxHeight: 120, outline: 'none', color: 'var(--color-text)', background: 'var(--color-bg-secondary)' },
  sendBtn: { width: 36, height: 36, borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--color-primary)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
};
