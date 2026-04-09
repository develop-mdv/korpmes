interface TypingIndicatorProps {
  typingUsers: string[];
}

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null;

  const label =
    typingUsers.length === 1
      ? `${typingUsers[0]} печатает`
      : typingUsers.length === 2
        ? `${typingUsers[0]} и ${typingUsers[1]} печатают`
        : `${typingUsers[0]} и ещё ${typingUsers.length - 1} печатают`;

  return (
    <div className="typing-indicator">
      <span>{label}</span>
      <span className="typing-indicator__dots">
        <span className="typing-indicator__dot" />
        <span className="typing-indicator__dot" style={{ animationDelay: '0.15s' }} />
        <span className="typing-indicator__dot" style={{ animationDelay: '0.3s' }} />
      </span>
    </div>
  );
}
