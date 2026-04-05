import React, { useState } from 'react';
import { MessageBubble } from './MessageBubble';

interface ThreadPanelProps {
  parentMessage: any;
  replies: any[];
  onClose: () => void;
  onSendReply: (content: string) => void;
}

export function ThreadPanel({ parentMessage, replies, onClose, onSendReply }: ThreadPanelProps) {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (!text.trim()) return;
    onSendReply(text.trim());
    setText('');
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Thread</h3>
        <button style={styles.closeBtn} onClick={onClose}>&times;</button>
      </div>

      <div style={styles.parent}>
        <MessageBubble message={parentMessage} isOwn={false} showSender />
      </div>

      <div style={styles.divider}>
        <span>{replies.length} {replies.length === 1 ? 'reply' : 'replies'}</span>
      </div>

      <div style={styles.replies}>
        {replies.map((reply) => (
          <MessageBubble key={reply.id} message={reply} isOwn={false} showSender />
        ))}
      </div>

      <div style={styles.inputArea}>
        <input
          style={styles.input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Reply..."
        />
        <button style={styles.sendBtn} onClick={handleSend}>Send</button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { width: 360, borderLeft: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-surface)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--color-border)' },
  title: { fontSize: 16, fontWeight: 600, margin: 0 },
  closeBtn: { width: 28, height: 28, border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer', color: 'var(--color-text-secondary)' },
  parent: { padding: '12px 0', borderBottom: '1px solid var(--color-border)' },
  divider: { padding: '8px 16px', fontSize: 12, color: 'var(--color-text-tertiary)' },
  replies: { flex: 1, overflowY: 'auto', padding: '8px 0' },
  inputArea: { display: 'flex', gap: 8, padding: 12, borderTop: '1px solid var(--color-border)' },
  input: { flex: 1, padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: 14, outline: 'none' },
  sendBtn: { padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--color-primary)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
};
