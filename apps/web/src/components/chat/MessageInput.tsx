import { KeyboardEvent, useCallback, useRef, useState } from 'react';

interface MessageInputProps {
  onSend: (content: string) => void;
  onTyping?: () => void;
  onAttach?: (files: FileList) => void;
  disabled?: boolean;
}

export function MessageInput({ onSend, onTyping, onAttach, disabled = false }: MessageInputProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;

    onSend(trimmed);
    setText('');

    if (textareaRef.current) {
      textareaRef.current.style.height = '48px';
    }
  }, [onSend, text]);

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

  return (
    <div className="composer">
      <button className="composer__attach" onClick={() => fileInputRef.current?.click()} title="Прикрепить файл">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
        </svg>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={(event) => {
          if (event.target.files && event.target.files.length > 0) {
            onAttach?.(event.target.files);
            event.target.value = '';
          }
        }}
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

      <button className="composer__send" onClick={handleSend} disabled={!text.trim() || disabled} title="Отправить">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
        </svg>
      </button>
    </div>
  );
}
