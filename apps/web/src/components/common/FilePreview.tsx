import React from 'react';

interface FilePreviewProps {
  file: {
    id: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    thumbnailUrl?: string;
    downloadUrl?: string;
  };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function FilePreview({ file }: FilePreviewProps) {
  const isImage = file.mimeType.startsWith('image/');

  return (
    <div style={styles.container}>
      {isImage && file.thumbnailUrl ? (
        <img src={file.thumbnailUrl} alt={file.originalName} style={styles.image} />
      ) : (
        <div style={styles.icon}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
      )}
      <div style={styles.info}>
        <span style={styles.name}>{file.originalName}</span>
        <span style={styles.size}>{formatFileSize(file.sizeBytes)}</span>
      </div>
      {file.downloadUrl && (
        <a href={file.downloadUrl} style={styles.download} download title="Download">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </a>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', alignItems: 'center', gap: 10, padding: 10, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: 'var(--color-bg-secondary)', maxWidth: 300 },
  image: { width: 48, height: 48, borderRadius: 'var(--radius-sm)', objectFit: 'cover' },
  icon: { width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text-secondary)' },
  info: { flex: 1, minWidth: 0 },
  name: { display: 'block', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-text)' },
  size: { display: 'block', fontSize: 11, color: 'var(--color-text-tertiary)' },
  download: { color: 'var(--color-primary)', padding: 4 },
};
