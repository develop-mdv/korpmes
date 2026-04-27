import React, { useEffect, useState, useCallback } from 'react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { useOrganizationStore } from '@/stores/organization.store';
import { FilePreviewModal } from '@/components/files/FilePreviewModal';
import * as filesApi from '@/api/files.api';
import { formatDistanceToNow } from 'date-fns';

type FileInfo = filesApi.FileInfo;
type FileCategory = 'images' | 'documents' | 'video' | 'audio' | 'other';

function getCategory(mimeType: string): FileCategory {
  if (mimeType.startsWith('image/')) return 'images';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (
    mimeType.includes('pdf') ||
    mimeType.includes('word') ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('presentation') ||
    mimeType.startsWith('text/')
  )
    return 'documents';
  return 'other';
}

function getCategoryIcon(cat: FileCategory): string {
  return { images: '🖼️', documents: '📄', video: '🎬', audio: '🎵', other: '📦' }[cat];
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Can we show a preview for this MIME?
function isPreviewable(mimeType: string): boolean {
  if (mimeType.startsWith('image/')) return true;
  if (mimeType.startsWith('video/')) return true;
  if (mimeType.startsWith('audio/')) return true;
  if (mimeType.startsWith('text/')) return true;
  if (mimeType === 'application/pdf') return true;
  const officeTypes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
  ];
  return officeTypes.includes(mimeType);
}

interface FileRowProps {
  file: FileInfo;
  onDownload: (id: string) => void;
  onPreview: (file: FileInfo) => void;
}

function FileRow({ file, onDownload, onPreview }: FileRowProps) {
  const category = getCategory(file.mimeType);
  const canPreview = isPreviewable(file.mimeType);

  return (
    <div style={styles.row}>
      {/* Thumbnail or icon */}
      <div style={styles.thumb}>
        {category === 'images' && file.thumbnailKey ? (
          <img
            src={`/api/files/${file.id}/thumbnail`}
            alt=""
            style={styles.thumbImg}
            loading="lazy"
          />
        ) : (
          <span style={{ fontSize: 22 }}>{getCategoryIcon(category)}</span>
        )}
      </div>

      <div style={styles.rowInfo}>
        <span style={styles.rowName}>{file.originalName}</span>
        <span style={styles.rowMeta}>
          {formatSize(file.sizeBytes)} · {formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}
        </span>
      </div>

      <div style={styles.rowActions}>
        {canPreview && (
          <button style={styles.previewBtn} onClick={() => onPreview(file)} title="Preview">
            👁
          </button>
        )}
        <button style={styles.downloadBtn} onClick={() => onDownload(file.id)} title="Download">
          ↓
        </button>
      </div>
    </div>
  );
}

const CATEGORIES: FileCategory[] = ['images', 'documents', 'video', 'audio', 'other'];
const CATEGORY_LABELS: Record<FileCategory, string> = {
  images: 'Images',
  documents: 'Documents',
  video: 'Video',
  audio: 'Audio',
  other: 'Other',
};

export function FilesPage() {
  const { currentOrg } = useOrganizationStore();
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<FileCategory | 'all'>('all');

  // Preview state
  const [previewFile, setPreviewFile] = useState<FileInfo | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (!currentOrg) return;
    filesApi
      .listFiles({ orgId: currentOrg.id })
      .then(setFiles)
      .finally(() => setLoading(false));
  }, [currentOrg]);

  const handleDownload = useCallback(async (id: string) => {
    const { url } = await filesApi.getDownloadUrl(id);
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  }, []);

  const handlePreview = useCallback(async (file: FileInfo) => {
    setPreviewLoading(true);
    setPreviewFile(file);
    try {
      const { url } = await filesApi.getDownloadUrl(file.id);
      setPreviewUrl(url);
    } catch {
      setPreviewFile(null);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  const closePreview = useCallback(() => {
    setPreviewFile(null);
    setPreviewUrl('');
  }, []);

  const grouped = files.reduce<Record<FileCategory, FileInfo[]>>(
    (acc, f) => { acc[getCategory(f.mimeType)].push(f); return acc; },
    { images: [], documents: [], video: [], audio: [], other: [] },
  );

  const filteredCategories =
    activeCategory === 'all'
      ? CATEGORIES.filter((c) => grouped[c].length > 0)
      : grouped[activeCategory].length > 0
      ? [activeCategory]
      : [];

  const totalCount = files.length;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Files</h1>
        {!loading && (
          <span style={styles.count}>{totalCount} file{totalCount !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Category filter tabs */}
      <div style={styles.tabs}>
        {(['all', ...CATEGORIES] as const).map((cat) => {
          const count = cat === 'all' ? totalCount : grouped[cat].length;
          if (cat !== 'all' && count === 0) return null;
          return (
            <button
              key={cat}
              style={{ ...styles.tab, ...(activeCategory === cat ? styles.tabActive : {}) }}
              onClick={() => setActiveCategory(cat)}
            >
              {cat === 'all' ? 'All' : `${getCategoryIcon(cat)} ${CATEGORY_LABELS[cat]}`}
              {count > 0 && <span style={styles.tabBadge}>{count}</span>}
            </button>
          );
        })}
      </div>

      {loading && <div style={styles.centered}><LoadingSpinner /></div>}

      {!loading && totalCount === 0 && (
        <EmptyState title="No files yet" description="Files shared in chats and tasks will appear here" />
      )}

      {!loading && filteredCategories.length === 0 && totalCount > 0 && (
        <EmptyState title="No files in this category" description="" />
      )}

      {!loading &&
        filteredCategories.map((cat) => (
          <div key={cat} style={styles.group}>
            {activeCategory === 'all' && (
              <div style={styles.groupHeader}>
                {getCategoryIcon(cat)} {CATEGORY_LABELS[cat]}
              </div>
            )}
            {grouped[cat].map((file) => (
              <FileRow
                key={file.id}
                file={file}
                onDownload={handleDownload}
                onPreview={handlePreview}
              />
            ))}
          </div>
        ))}

      {/* Preview modal */}
      {previewFile && !previewLoading && previewUrl && (
        <FilePreviewModal
          file={previewFile}
          signedUrl={previewUrl}
          onClose={closePreview}
        />
      )}
      {previewLoading && (
        <div style={styles.previewSpinner}>
          <LoadingSpinner />
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: 'clamp(12px, 4vw, 24px)', maxWidth: 900, margin: '0 auto' },
  header: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--color-text)' },
  count: { fontSize: 14, color: 'var(--color-text-secondary)' },
  tabs: { display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' },
  tab: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '6px 14px', borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)', background: 'transparent',
    cursor: 'pointer', fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)',
  },
  tabActive: {
    background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)',
  },
  tabBadge: {
    fontSize: 11, background: 'rgba(0,0,0,0.18)', borderRadius: 10,
    padding: '1px 6px', fontWeight: 600,
  },
  centered: { display: 'flex', justifyContent: 'center', paddingTop: 40 },
  group: { marginBottom: 24 },
  groupHeader: {
    fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
    color: 'var(--color-text-secondary)', padding: '6px 0',
    borderBottom: '1px solid var(--color-border)', marginBottom: 4,
  },
  row: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
    borderRadius: 6, border: '1px solid var(--color-border)',
    marginBottom: 4, background: 'var(--color-surface)',
    transition: 'border-color 0.15s',
  },
  thumb: {
    width: 40, height: 40, borderRadius: 4, overflow: 'hidden',
    background: 'var(--color-bg-secondary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  thumbImg: { width: '100%', height: '100%', objectFit: 'cover' },
  rowInfo: { flex: 1, minWidth: 0 },
  rowName: {
    display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--color-text)',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  rowMeta: { display: 'block', fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 1 },
  rowActions: { display: 'flex', gap: 4 },
  previewBtn: {
    width: 32, height: 32, borderRadius: 6, border: '1px solid var(--color-border)',
    background: 'transparent', cursor: 'pointer', fontSize: 16,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  downloadBtn: {
    width: 32, height: 32, borderRadius: 6, border: '1px solid var(--color-border)',
    background: 'transparent', cursor: 'pointer', fontSize: 16,
    color: 'var(--color-primary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  previewSpinner: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
  },
};
