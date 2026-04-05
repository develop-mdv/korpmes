import { CSSProperties } from 'react';

interface LoadingSpinnerProps {
  size?: number;
}

export function LoadingSpinner({ size = 32 }: LoadingSpinnerProps) {
  const containerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  };

  const spinnerStyle: CSSProperties = {
    width: size,
    height: size,
    border: `3px solid var(--color-border)`,
    borderTopColor: 'var(--color-primary)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  };

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={containerStyle}>
        <div style={spinnerStyle} />
      </div>
    </>
  );
}
