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
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/msword', // doc
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.ms-excel', // xls
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
  'application/vnd.ms-powerpoint', // ppt
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

/** Shows a text file (up to 64 KB). */
function TextPreview({ url }: { url: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(url)
      .then((r) => r.text())
      .then((t) => setContent(t.slice(0, 65536)))
      .catch(() => setError(true));
  }, [url]);

  if (error) return <p style={styles.msg}>Failed to load file content.</p>;
  if (!content) return <p style={styles.msg}>Loading…</p>;

  return (
    <pre style={styles.pre}>{content}</pre>
  );
}

function isPubliclyReachable(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return false;
    const host = u.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') return false;
    // RFC1918 private ranges
    if (/^10\./.test(host)) return false;
    if (/^192\.168\./.test(host)) return false;
    if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

export function FilePreviewModal({ file, signedUrl, onClose }: Props) {
  const cat = getCategory(file.mimeType);
  const officeReachable = isPubliclyReachable(signedUrl);

  // MS Office Online viewer needs a publicly reachable HTTPS URL — falls back gracefully on localhost/dev.
  const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(signedUrl)}`;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div style={styles.backdrop} onClick={handleBackdropClick}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={styles.filename} title={file.originalName}>
              {file.originalName}
            </span>
            <span style={styles.meta}>{file.mimeType} · {formatSize(file.sizeBytes)}</span>
          </div>
          <div style={styles.headerRight}>
            <a href={signedUrl} download={file.originalName} style={styles.downloadBtn}>
              ↓ Download
            </a>
            <button style={styles.closeBtn} onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={styles.body}>
          {cat === 'image' && (
            <img
              src={signedUrl}
              alt={file.originalName}
              style={styles.image}
              draggable={false}
            />
          )}

          {cat === 'video' && (
            <video
              src={signedUrl}
              controls
              autoPlay={false}
              style={styles.video}
            />
          )}

          {cat === 'audio' && (
            <div style={styles.audioWrap}>
              <div style={styles.audioIcon}>🎵</div>
              <p style={styles.audioName}>{file.originalName}</p>
              <audio src={signedUrl} controls style={{ width: '100%', marginTop: 12 }} />
            </div>
          )}

          {cat === 'pdf' && (
            <iframe
              src={signedUrl}
              title={file.originalName}
              style={styles.frame}
            />
          )}

          {cat === 'office' && officeReachable && (
            <iframe
              src={officeViewerUrl}
              title={file.originalName}
              style={styles.frame}
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          )}

          {cat === 'office' && !officeReachable && (
            <div style={styles.unknownBox}>
              <span style={styles.unknownIcon}>📊</span>
              <p style={styles.unknownText}>
                Предпросмотр Word/Excel/PowerPoint доступен только в продакшене
                (Microsoft Office Online не может открыть файл с локального
                адреса). Скачай файл, чтобы посмотреть.
              </p>
              <a href={signedUrl} download={file.originalName} style={styles.dlLink}>
                ↓ Скачать {file.originalName}
              </a>
            </div>
          )}

          {cat === 'text' && <TextPreview url={signedUrl} />}

          {cat === 'unknown' && (
            <div style={styles.unknownBox}>
              <span style={styles.unknownIcon}>📄</span>
              <p style={styles.unknownText}>Preview not available for this file type.</p>
              <a href={signedUrl} download={file.originalName} style={styles.dlLink}>
                ↓ Download {file.originalName}
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
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
  },
  modal: {
    background: '#1F2937', borderRadius: 12, width: '92vw', maxWidth: 1100,
    height: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
    boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 20px', borderBottom: '1px solid #374151', flexShrink: 0,
  },
  headerLeft: { display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' },
  filename: {
    color: '#F9FAFB', fontSize: 15, fontWeight: 600,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60vw',
  },
  meta: { color: '#9CA3AF', fontSize: 12 },
  headerRight: { display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 },
  downloadBtn: {
    padding: '6px 14px', background: '#374151', color: '#D1D5DB',
    borderRadius: 6, textDecoration: 'none', fontSize: 13, fontWeight: 500,
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: '50%', border: 'none',
    background: '#374151', color: '#9CA3AF', fontSize: 20, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    lineHeight: 1,
  },
  body: {
    flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: '#111827',
  },
  image: { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' },
  video: { maxWidth: '100%', maxHeight: '100%' },
  audioWrap: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
    padding: 40, width: '100%', maxWidth: 500,
  },
  audioIcon: { fontSize: 64 },
  audioName: { color: '#D1D5DB', fontSize: 15, margin: 0, textAlign: 'center' },
  frame: { width: '100%', height: '100%', border: 'none' },
  pre: {
    margin: 0, padding: 24, color: '#D1D5DB', fontFamily: 'monospace', fontSize: 13,
    overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
    width: '100%', boxSizing: 'border-box',
  },
  msg: { color: '#9CA3AF', padding: 24 },
  unknownBox: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
    color: '#9CA3AF', padding: 40,
  },
  unknownIcon: { fontSize: 72 },
  unknownText: { fontSize: 15, margin: 0 },
  dlLink: {
    padding: '10px 24px', background: '#4F46E5', color: '#fff', borderRadius: 8,
    textDecoration: 'none', fontWeight: 600, fontSize: 14,
  },
};
