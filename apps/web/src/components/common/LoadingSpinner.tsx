import { CSSProperties } from 'react';

interface LoadingSpinnerProps {
  size?: number;
}

export function LoadingSpinner({ size = 32 }: LoadingSpinnerProps) {
  const style = {
    width: size,
    height: size,
  } as CSSProperties;

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 18 }}>
      <div className="lux-spinner" style={style} />
    </div>
  );
}
