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

function TextPreview({ url }: { url: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(url)
      .then((response) => response.text())
      .then((text) => setContent(text.slice(0, 65536)))
      .catch(() => setError(true));
  }, [url]);

  if (error) {
    return <p style={styles.msg}>Не удалось загрузить содержимое файла.</p>;
  }

  if (!content) {
    return <p style={styles.msg}>Загрузка...</p>;
  }

  return <pre style={styles.pre}>{content}</pre>;
}

export function FilePreviewModal({ file, signedUrl, onClose }: Props) {
  const category = getCategory(file.mimeType);
  const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(signedUrl)}`;

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
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

          {category === 'office' && (
            <iframe
              src={officeViewerUrl}
              title={file.originalName}
              style={styles.frame}
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          )}

          {category === 'text' && <TextPreview url={signedUrl} />}

          {category === 'unknown' && (
            <div style={styles.unknownBox}>
              <span style={styles.unknownIcon}>⌁</span>
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
    background: 'rgba(36, 27, 17, 0.24)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    backdropFilter: 'blur(18px)',
  },
  modal: {
    background: 'var(--color-surface-strong)',
    borderRadius: 28,
    width: '92vw',
    maxWidth: 1120,
    height: '88vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: 'var(--shadow-lg)',
    border: '1px solid var(--color-border)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    padding: '16px 22px',
    borderBottom: '1px solid var(--color-border)',
    flexShrink: 0,
    background: 'linear-gradient(180deg, rgba(255,255,255,0.28), rgba(255,255,255,0.08))',
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    overflow: 'hidden',
  },
  filename: {
    color: 'var(--color-text)',
    fontSize: 18,
    fontWeight: 700,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '60vw',
  },
  meta: {
    color: 'var(--color-text-secondary)',
    fontSize: 13,
  },
  headerRight: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    flexShrink: 0,
  },
  downloadBtn: {
    padding: '10px 16px',
    background: 'linear-gradient(135deg, var(--color-primary-light), var(--color-primary))',
    color: '#1c1309',
    borderRadius: 999,
    textDecoration: 'none',
    fontSize: 13,
    fontWeight: 700,
    boxShadow: '0 10px 24px rgba(159, 122, 61, 0.18)',
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: '50%',
    border: '1px solid var(--color-border)',
    background: 'rgba(255, 255, 255, 0.48)',
    color: 'var(--color-text-secondary)',
    fontSize: 22,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  },
  body: {
    flex: 1,
    overflow: 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background:
      'radial-gradient(circle at top left, rgba(159, 122, 61, 0.12), transparent 26%), linear-gradient(180deg, var(--color-bg-secondary), var(--color-bg))',
  },
  image: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
  },
  video: {
    maxWidth: '100%',
    maxHeight: '100%',
  },
  audioWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    padding: 40,
    width: '100%',
    maxWidth: 520,
  },
  audioIcon: {
    fontSize: 64,
  },
  audioName: {
    color: 'var(--color-text)',
    fontSize: 15,
    margin: 0,
    textAlign: 'center',
  },
  frame: {
    width: '100%',
    height: '100%',
    border: 'none',
  },
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
  msg: {
    color: 'var(--color-text-secondary)',
    padding: 24,
  },
  unknownBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    color: 'var(--color-text-secondary)',
    padding: 40,
    textAlign: 'center',
  },
  unknownIcon: {
    fontSize: 72,
  },
  unknownText: {
    fontSize: 15,
    margin: 0,
  },
  dlLink: {
    padding: '10px 24px',
    background: 'var(--color-bg-tertiary)',
    color: 'var(--color-text)',
    borderRadius: 999,
    textDecoration: 'none',
    fontWeight: 700,
    fontSize: 14,
    border: '1px solid var(--color-border)',
  },
};
