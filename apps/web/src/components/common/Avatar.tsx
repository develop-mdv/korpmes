import { CSSProperties } from 'react';

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  online?: boolean;
}

const sizeMap = { sm: 32, md: 40, lg: 56 };
const fontSizeMap = { sm: 12, md: 14, lg: 20 };

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function getColorFromName(name: string): string {
  const colors = ['#4F46E5', '#059669', '#D97706', '#DC2626', '#7C3AED', '#2563EB', '#DB2777'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function Avatar({ src, name: rawName, size = 'md', online }: AvatarProps) {
  const name = rawName || '?';
  const px = sizeMap[size];
  const fontSize = fontSizeMap[size];

  const containerStyle: CSSProperties = {
    position: 'relative',
    width: px,
    height: px,
    flexShrink: 0,
  };

  const imgStyle: CSSProperties = {
    width: px,
    height: px,
    borderRadius: '50%',
    objectFit: 'cover',
  };

  const fallbackStyle: CSSProperties = {
    width: px,
    height: px,
    borderRadius: '50%',
    backgroundColor: getColorFromName(name),
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize,
    fontWeight: 600,
    userSelect: 'none',
  };

  const dotSize = size === 'sm' ? 8 : size === 'md' ? 10 : 14;
  const dotStyle: CSSProperties = {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: dotSize,
    height: dotSize,
    borderRadius: '50%',
    backgroundColor: 'var(--color-success)',
    border: '2px solid var(--color-bg)',
  };

  return (
    <div style={containerStyle}>
      {src ? (
        <img src={src} alt={name} style={imgStyle} />
      ) : (
        <div style={fallbackStyle}>{getInitials(name)}</div>
      )}
      {online && <div style={dotStyle} />}
    </div>
  );
}
