import { CSSProperties, ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 48,
  textAlign: 'center',
};

const iconWrapStyle: CSSProperties = {
  fontSize: 48,
  color: 'var(--color-text-tertiary)',
  marginBottom: 16,
};

const titleStyleObj: CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  color: 'var(--color-text)',
  marginBottom: 8,
};

const descStyle: CSSProperties = {
  fontSize: 14,
  color: 'var(--color-text-secondary)',
  maxWidth: 360,
  marginBottom: 20,
};

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div style={containerStyle}>
      {icon && <div style={iconWrapStyle}>{icon}</div>}
      <h3 style={titleStyleObj}>{title}</h3>
      {description && <p style={descStyle}>{description}</p>}
      {action}
    </div>
  );
}
