import { ReactNode } from 'react';

interface AuthShellProps {
  eyebrow: string;
  title: string;
  description: string;
  formEyebrow: string;
  formTitle: string;
  formDescription: string;
  quote: string;
  stats: Array<{ label: string; value: string }>;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthShell({
  eyebrow,
  title,
  description,
  formEyebrow,
  formTitle,
  formDescription,
  quote,
  stats,
  children,
  footer,
}: AuthShellProps) {
  return (
    <div className="auth-shell">
      <div className="auth-shell__grid">
        <aside className="auth-shell__hero">
          <div>
            <div className="auth-shell__brand">
              <div className="brand-mark">S</div>
              <div>
                <div className="sidebar-shell__eyebrow">Закрытая сеть</div>
                <div className="sidebar-shell__title">StaffHub</div>
              </div>
            </div>
            <div className="auth-shell__copy">
              <div className="auth-shell__eyebrow">{eyebrow}</div>
              <h1 className="auth-shell__title">{title}</h1>
              <p className="auth-shell__description">{description}</p>
            </div>
            <div className="auth-shell__stats">
              {stats.map((stat) => (
                <div key={stat.label} className="auth-shell__stat">
                  <div className="auth-shell__stat-value">{stat.value}</div>
                  <div className="auth-shell__stat-label">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <p className="auth-shell__quote">{quote}</p>
        </aside>

        <section className="auth-shell__panel">
          <div className="auth-shell__form-copy">
            <div className="auth-shell__form-title">{formEyebrow}</div>
            <div className="auth-shell__form-subtitle">{formTitle}</div>
            <p className="auth-shell__form-description">{formDescription}</p>
          </div>

          {children}

          {footer && <div className="auth-shell__footer">{footer}</div>}
        </section>
      </div>
    </div>
  );
}
