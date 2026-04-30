import React, { useEffect, useState } from 'react';

export interface PreviewFile {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

interface Props {
  file: PreviewFile;
  signedUrl: string;
  onClose: () => void;
}

type Category = 'image' | 'video' | 'audio' | 'pdf' | 'office' | 'text' | 'unknown';

const OFFICE_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
];

function getCategory(mimeType: string): Category {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf') return 'pdf';
  if (OFFICE_TYPES.includes(mimeType)) return 'office';
  if (mimeType.startsWith('text/')) return 'text';
  return 'unknown';
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isPubliclyReachable(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    if (['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname)) return false;
    if (/^10\./.test(parsed.hostname) || /^192\.168\./.test(parsed.hostname)) return false;
    if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(parsed.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

function TextPreview({ url }: { url: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(url)
      .then((response) => response.text())
      .then((text) => setContent(text.slice(0, 65536)))
      .catch(() => setError(true));
  }, [url]);

  if (error) return <p style={styles.msg}>Не удалось загрузить содержимое файла.</p>;
  if (!content) return <p style={styles.msg}>Загрузка...</p>;
  return <pre style={styles.pre}>{content}</pre>;
}

export function FilePreviewModal({ file, signedUrl, onClose }: Props) {
  const category = getCategory(file.mimeType);
  const officeReachable = isPubliclyReachable(signedUrl);
  const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(signedUrl)}`;

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <div style={styles.backdrop} onClick={handleBackdropClick}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={styles.filename} title={file.originalName}>
              {file.originalName}
            </span>
            <span style={styles.meta}>
              {file.mimeType} • {formatSize(file.sizeBytes)}
            </span>
          </div>
          <div style={styles.headerRight}>
            <a href={signedUrl} download={file.originalName} style={styles.downloadBtn}>
              Скачать
            </a>
            <button style={styles.closeBtn} onClick={onClose} aria-label="Закрыть">
              ×
            </button>
          </div>
        </div>

        <div style={styles.body}>
          {category === 'image' && <img src={signedUrl} alt={file.originalName} style={styles.image} draggable={false} />}
          {category === 'video' && <video src={signedUrl} controls autoPlay={false} style={styles.video} />}

          {category === 'audio' && (
            <div style={styles.audioWrap}>
              <div style={styles.audioIcon}>♪</div>
              <p style={styles.audioName}>{file.originalName}</p>
              <audio src={signedUrl} controls style={{ width: '100%', marginTop: 12 }} />
            </div>
          )}

          {category === 'pdf' && <iframe src={signedUrl} title={file.originalName} style={styles.frame} />}

          {category === 'office' && officeReachable && (
            <iframe
              src={officeViewerUrl}
              title={file.originalName}
              style={styles.frame}
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          )}

          {category === 'office' && !officeReachable && (
            <div style={styles.unknownBox}>
              <span style={styles.unknownIcon}>DOC</span>
              <p style={styles.unknownText}>
                Предпросмотр Word, Excel и PowerPoint доступен только для публичного HTTPS-адреса. В локальной среде
                файл можно скачать и открыть на устройстве.
              </p>
              <a href={signedUrl} download={file.originalName} style={styles.dlLink}>
                Скачать {file.originalName}
              </a>
            </div>
          )}

          {category === 'text' && <TextPreview url={signedUrl} />}

          {category === 'unknown' && (
            <div style={styles.unknownBox}>
              <span style={styles.unknownIcon}>FILE</span>
              <p style={styles.unknownText}>Для этого типа файла встроенный просмотр пока недоступен.</p>
              <a href={signedUrl} download={file.originalName} style={styles.dlLink}>
                Скачать {file.originalName}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 2000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    background: 'rgba(36, 27, 17, 0.24)',
    backdropFilter: 'blur(18px)',
  },
  modal: {
    width: 'min(1120px, 94vw)',
    height: 'min(820px, 90dvh)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    borderRadius: 24,
    background: 'var(--color-surface-strong)',
    border: '1px solid var(--color-border)',
    boxShadow: 'var(--shadow-lg)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    padding: '14px 18px',
    borderBottom: '1px solid var(--color-border)',
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    minWidth: 0,
  },
  filename: {
    color: 'var(--color-text)',
    fontSize: 16,
    fontWeight: 800,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '62vw',
  },
  meta: {
    color: 'var(--color-text-secondary)',
    fontSize: 12,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  downloadBtn: {
    minHeight: 38,
    display: 'inline-grid',
    placeItems: 'center',
    padding: '0 15px',
    borderRadius: 999,
    color: '#1c1309',
    background: 'linear-gradient(135deg, var(--color-primary-light), var(--color-primary))',
    textDecoration: 'none',
    fontSize: 13,
    fontWeight: 800,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    border: '1px solid var(--color-border)',
    background: 'var(--color-surface-soft)',
    color: 'var(--color-text-secondary)',
    fontSize: 22,
    cursor: 'pointer',
    display: 'grid',
    placeItems: 'center',
    lineHeight: 1,
  },
  body: {
    flex: 1,
    minHeight: 0,
    overflow: 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background:
      'radial-gradient(circle at top left, rgba(159, 122, 61, 0.1), transparent 28%), linear-gradient(180deg, var(--color-bg-secondary), var(--color-bg))',
  },
  image: { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' },
  video: { maxWidth: '100%', maxHeight: '100%' },
  audioWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    padding: 32,
    width: 'min(520px, 100%)',
  },
  audioIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    display: 'grid',
    placeItems: 'center',
    background: 'var(--color-primary-faint)',
    color: 'var(--color-primary-dark)',
    fontSize: 34,
    fontWeight: 800,
  },
  audioName: { color: 'var(--color-text)', fontSize: 15, margin: 0, textAlign: 'center' },
  frame: { width: '100%', height: '100%', border: 'none' },
  pre: {
    margin: 0,
    padding: 24,
    color: 'var(--color-text)',
    fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
    fontSize: 13,
    overflowX: 'auto',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    width: '100%',
    boxSizing: 'border-box',
  },
  msg: { color: 'var(--color-text-secondary)', padding: 24 },
  unknownBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    maxWidth: 520,
    color: 'var(--color-text-secondary)',
    padding: 32,
    textAlign: 'center',
  },
  unknownIcon: {
    width: 74,
    height: 74,
    borderRadius: 22,
    display: 'grid',
    placeItems: 'center',
    color: 'var(--color-primary-dark)',
    background: 'var(--color-primary-faint)',
    fontSize: 15,
    fontWeight: 900,
  },
  unknownText: { fontSize: 15, margin: 0 },
  dlLink: {
    minHeight: 42,
    display: 'inline-grid',
    placeItems: 'center',
    padding: '0 18px',
    color: 'var(--color-text)',
    background: 'var(--color-bg-tertiary)',
    border: '1px solid var(--color-border)',
    borderRadius: 999,
    textDecoration: 'none',
    fontWeight: 800,
    fontSize: 14,
  },
};
