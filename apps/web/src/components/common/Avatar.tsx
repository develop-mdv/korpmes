import { CSSProperties } from 'react';

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  online?: boolean;
}

const sizeMap = { sm: 36, md: 44, lg: 60 };
const fontSizeMap = { sm: 13, md: 14, lg: 20 };

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function getGradientFromName(name: string): string {
  const gradients = [
    'linear-gradient(135deg, #f4dda5, #9f7a3d)',
    'linear-gradient(135deg, #7ad9c5, #1b8d7b)',
    'linear-gradient(135deg, #9fb4ff, #4568d1)',
    'linear-gradient(135deg, #f5b8a2, #b85d3c)',
    'linear-gradient(135deg, #e8c7f8, #8c5db2)',
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return gradients[Math.abs(hash) % gradients.length];
}

export function Avatar({ src, name: rawName, size = 'md', online = false }: AvatarProps) {
  const name = rawName || '?';
  const px = sizeMap[size];
  const dotSize = size === 'sm' ? 10 : size === 'md' ? 11 : 14;

  const shellStyle = {
    width: px,
    height: px,
  } as CSSProperties;

  const fallbackStyle = {
    background: getGradientFromName(name),
    fontSize: fontSizeMap[size],
  } as CSSProperties;

  const dotStyle = {
    width: dotSize,
    height: dotSize,
  } as CSSProperties;

  return (
    <div className="avatar-shell" style={shellStyle}>
      {src ? (
        <img src={src} alt={name} className="avatar-shell__image" />
      ) : (
        <div className="avatar-shell__fallback" style={fallbackStyle}>
          {getInitials(name)}
        </div>
      )}
      {online && <span className="avatar-shell__dot" style={dotStyle} />}
    </div>
  );
}
