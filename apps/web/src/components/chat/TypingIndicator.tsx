import React from 'react';

interface TypingIndicatorProps {
  typingUsers: string[];
}

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null;

  const text =
    typingUsers.length === 1
      ? `${typingUsers[0]} is typing`
      : typingUsers.length === 2
        ? `${typingUsers[0]} and ${typingUsers[1]} are typing`
        : `${typingUsers[0]} and ${typingUsers.length - 1} others are typing`;

  return (
    <div style={styles.container}>
      <span style={styles.text}>{text}</span>
      <span style={styles.dots}>
        <span style={styles.dot}>.</span>
        <span style={{ ...styles.dot, animationDelay: '0.2s' }}>.</span>
        <span style={{ ...styles.dot, animationDelay: '0.4s' }}>.</span>
      </span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '4px 16px', fontSize: 12, color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', gap: 2, minHeight: 20 },
  text: {},
  dots: { display: 'inline-flex' },
  dot: { animation: 'typingDot 1s infinite' },
};
