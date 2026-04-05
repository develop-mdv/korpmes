import { CSSProperties } from 'react';

interface BadgeProps {
  count: number;
  max?: number;
}

export function Badge({ count, max = 99 }: BadgeProps) {
  if (count <= 0) return null;

  const display = count > max ? `${max}+` : String(count);

  const style: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 20,
    height: 20,
    padding: '0 6px',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--color-error)',
    color: '#fff',
    fontSize: 11,
    fontWeight: 600,
    lineHeight: 1,
  };

  return <span style={style}>{display}</span>;
}
