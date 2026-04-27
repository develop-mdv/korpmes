import { CSSProperties, ReactNode, useEffect } from 'react';
import { useBreakpoint } from '@/hooks/useBreakpoint';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

const backdropStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const desktopCardStyle: CSSProperties = {
  backgroundColor: 'var(--color-surface)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-lg)',
  padding: 24,
  minWidth: 400,
  maxWidth: 560,
  width: '90%',
  maxHeight: '85vh',
  overflow: 'auto',
  position: 'relative',
};

const mobileCardStyle: CSSProperties = {
  backgroundColor: 'var(--color-surface)',
  boxShadow: 'var(--shadow-lg)',
  padding: 16,
  width: '100%',
  height: '100%',
  maxWidth: 'none',
  maxHeight: '100vh',
  borderRadius: 0,
  overflow: 'auto',
  position: 'relative',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 20,
};

const titleStyle: CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  color: 'var(--color-text)',
};

const desktopCloseButtonStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: 20,
  color: 'var(--color-text-tertiary)',
  cursor: 'pointer',
  padding: 4,
  lineHeight: 1,
};

const mobileCloseButtonStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: 24,
  color: 'var(--color-text-tertiary)',
  cursor: 'pointer',
  width: 40,
  height: 40,
  lineHeight: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
};

export function Modal({ open, onClose, title, children }: ModalProps) {
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  const cardStyle = isMobile ? mobileCardStyle : desktopCardStyle;
  const closeButtonStyle = isMobile ? mobileCloseButtonStyle : desktopCloseButtonStyle;

  return (
    <div style={backdropStyle} onClick={onClose}>
      <div style={cardStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>{title}</h2>
          <button style={closeButtonStyle} onClick={onClose} aria-label="Close">
            &#x2715;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
