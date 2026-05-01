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
      <div className="lux-empty__icon">
        {icon ?? (
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4.5 12.5 9 17l10.5-10" />
            <path d="M21 12a9 9 0 1 1-3.1-6.8" />
          </svg>
        )}
      </div>
      <h3 className="lux-empty__title">{title}</h3>
      {description && <p className="lux-empty__description">{description}</p>}
      {action}
    </div>
  );
}
