import React from 'react';
import { Avatar } from '@/components/common/Avatar';

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
  };
  isOwn: boolean;
  showSender: boolean;
}

export function MessageBubble({ message, isOwn, showSender }: MessageBubbleProps) {
  const time = new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ ...styles.wrapper, justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
      {!isOwn && showSender && (
        <Avatar name={message.senderName || '?'} size="sm" />
      )}
      <div style={{ ...styles.bubble, ...(isOwn ? styles.ownBubble : styles.otherBubble) }}>
        {!isOwn && showSender && (
          <div style={styles.senderName}>{message.senderName}</div>
        )}
        <div style={styles.content}>{message.content}</div>
        <div style={styles.meta}>
          {message.isEdited && <span style={styles.edited}>edited</span>}
          <span style={styles.time}>{time}</span>
        </div>
        {message.reactions && message.reactions.length > 0 && (
          <div style={styles.reactions}>
            {message.reactions.map((r) => (
              <span key={`${r.emoji}-${r.userId}`} style={styles.reaction}>{r.emoji}</span>
            ))}
          </div>
        )}
      </div>
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
  meta: { display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 4 },
  edited: { fontSize: 11, opacity: 0.7 },
  time: { fontSize: 11, opacity: 0.7 },
  reactions: { display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' },
  reaction: { fontSize: 12, padding: '2px 6px', borderRadius: 10, background: 'rgba(0,0,0,0.08)', cursor: 'pointer' },
};
