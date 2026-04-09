import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="lux-empty">
      <div className="lux-empty__icon">{icon ?? <span style={{ fontSize: 28 }}>◌</span>}</div>
      <h3 className="lux-empty__title">{title}</h3>
      {description && <p className="lux-empty__description">{description}</p>}
      {action}
    </div>
  );
}
