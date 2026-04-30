import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useOrganizationStore } from '@/stores/organization.store';
import { FilePreviewModal } from '@/components/files/FilePreviewModal';
import * as filesApi from '@/api/files.api';

type FileInfo = filesApi.FileInfo;
type FileCategory = 'images' | 'documents' | 'video' | 'audio' | 'other';

const CATEGORIES: FileCategory[] = ['images', 'documents', 'video', 'audio', 'other'];
const CATEGORY_LABELS: Record<FileCategory, string> = {
  images: 'Изображения',
  documents: 'Документы',
  video: 'Видео',
  audio: 'Аудио',
  other: 'Другое',
};
const CATEGORY_MARKS: Record<FileCategory, string> = {
  images: 'IMG',
  documents: 'DOC',
  video: 'VID',
  audio: 'AUD',
  other: 'FILE',
};

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
  ) {
    return 'documents';
  }
  return 'other';
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isPreviewable(mimeType: string): boolean {
  if (mimeType.startsWith('image/')) return true;
  if (mimeType.startsWith('video/')) return true;
  if (mimeType.startsWith('audio/')) return true;
  if (mimeType.startsWith('text/')) return true;
  if (mimeType === 'application/pdf') return true;

  return [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
  ].includes(mimeType);
}

function ActionIcon({ type }: { type: 'view' | 'download' }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {type === 'view' ? (
        <>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </>
      )}
    </svg>
  );
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
    <article className="lux-panel list-card" style={styles.row}>
      <div style={styles.fileMark}>{CATEGORY_MARKS[category]}</div>
      <div className="list-card__body">
        <div className="list-card__title" title={file.originalName} style={styles.fileName}>
          {file.originalName}
        </div>
        <div className="list-card__meta">
          <span>{formatSize(file.sizeBytes)}</span>
          <span>{formatDistanceToNow(new Date(file.createdAt), { addSuffix: true, locale: ru })}</span>
          <span>{CATEGORY_LABELS[category]}</span>
        </div>
      </div>
      <div className="list-card__actions">
        {canPreview && (
          <button className="icon-button" onClick={() => onPreview(file)} title="Просмотр" aria-label="Просмотр" type="button">
            <ActionIcon type="view" />
          </button>
        )}
        <button className="icon-button" onClick={() => onDownload(file.id)} title="Скачать" aria-label="Скачать" type="button">
          <ActionIcon type="download" />
        </button>
      </div>
    </article>
  );
}

export function FilesPage() {
  const { currentOrg } = useOrganizationStore();
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState<FileCategory | 'all'>('all');
  const [previewFile, setPreviewFile] = useState<FileInfo | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (!currentOrg) return;

    setLoading(true);
    setError('');
    filesApi
      .listFiles({ orgId: currentOrg.id })
      .then(setFiles)
      .catch(() => {
        setFiles([]);
        setError('Хранилище временно недоступно. Попробуйте обновить страницу чуть позже.');
      })
      .finally(() => setLoading(false));
  }, [currentOrg]);

  const grouped = useMemo(
    () =>
      files.reduce<Record<FileCategory, FileInfo[]>>(
        (accumulator, file) => {
          accumulator[getCategory(file.mimeType)].push(file);
          return accumulator;
        },
        { images: [], documents: [], video: [], audio: [], other: [] },
      ),
    [files],
  );

  const filteredCategories =
    activeCategory === 'all'
      ? CATEGORIES.filter((category) => grouped[category].length > 0)
      : grouped[activeCategory].length > 0
        ? [activeCategory]
        : [];

  const handleDownload = useCallback(async (id: string) => {
    const { url } = await filesApi.getDownloadUrl(id);
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();
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

  const totalCount = files.length;

  return (
    <div className="page-shell">
      <div className="page-shell__inner">
        <section className="lux-panel page-hero">
          <div className="page-hero__copy">
            <div className="page-hero__kicker">Файлы</div>
            <h1 className="page-hero__title">Все материалы пространства в одном аккуратном хранилище.</h1>
            <p className="page-hero__description">
              Документы, изображения, видео и вложения из чатов собраны в единую ленту с быстрым просмотром и скачиванием.
            </p>
            <div className="page-hero__meta">
              <span className="lux-pill">{totalCount} файлов</span>
              <span className="lux-pill">{grouped.documents.length} документов</span>
              <span className="lux-pill">{grouped.images.length} изображений</span>
            </div>
          </div>
        </section>

        <div style={styles.tabs}>
          {(['all', ...CATEGORIES] as const).map((category) => {
            const count = category === 'all' ? totalCount : grouped[category].length;
            if (category !== 'all' && count === 0) return null;
            const label = category === 'all' ? 'Все' : CATEGORY_LABELS[category];

            return (
              <button
                key={category}
                className={activeCategory === category ? 'lux-chip is-active' : 'lux-chip'}
                onClick={() => setActiveCategory(category)}
                type="button"
              >
                {label}
                {count > 0 && <span style={styles.tabBadge}>{count}</span>}
              </button>
            );
          })}
        </div>

        {error && <div className="lux-alert">{error}</div>}

        {loading && (
          <section className="lux-panel" style={styles.centered}>
            <LoadingSpinner />
          </section>
        )}

        {!loading && totalCount === 0 && (
          <section className="lux-panel" style={{ minHeight: 360 }}>
            <EmptyState
              title="Файлов пока нет"
              description="Вложения из чатов и задач будут появляться здесь автоматически."
            />
          </section>
        )}

        {!loading && filteredCategories.length === 0 && totalCount > 0 && (
          <section className="lux-panel" style={{ minHeight: 300 }}>
            <EmptyState
              title="В этой категории пусто"
              description="Выберите другую категорию или откройте все файлы."
            />
          </section>
        )}

        {!loading &&
          filteredCategories.map((category) => (
            <section key={category} className="collection-list">
              {activeCategory === 'all' && (
                <div style={styles.groupHeader}>
                  <span style={styles.groupMark}>{CATEGORY_MARKS[category]}</span>
                  {CATEGORY_LABELS[category]}
                </div>
              )}
              {grouped[category].map((file) => (
                <FileRow key={file.id} file={file} onDownload={handleDownload} onPreview={handlePreview} />
              ))}
            </section>
          ))}

        {previewFile && !previewLoading && previewUrl && (
          <FilePreviewModal file={previewFile} signedUrl={previewUrl} onClose={closePreview} />
        )}

        {previewLoading && (
          <div style={styles.previewSpinner}>
            <LoadingSpinner />
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  tabs: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  tabBadge: {
    marginLeft: 8,
    minWidth: 22,
    height: 22,
    padding: '0 7px',
    borderRadius: 999,
    display: 'inline-grid',
    placeItems: 'center',
    background: 'rgba(255,255,255,0.42)',
    fontSize: 11,
    fontWeight: 900,
  },
  centered: {
    minHeight: 320,
    display: 'grid',
    placeItems: 'center',
  },
  groupHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    color: 'var(--color-text-secondary)',
    fontSize: 12,
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
  },
  groupMark: {
    letterSpacing: 0,
    color: 'var(--color-primary-dark)',
  },
  row: {
    alignItems: 'center',
    borderRadius: 18,
    padding: '13px 14px',
  },
  fileMark: {
    width: 44,
    height: 44,
    borderRadius: 14,
    display: 'grid',
    placeItems: 'center',
    color: 'var(--color-primary-dark)',
    background: 'var(--color-primary-faint)',
    border: '1px solid var(--color-border)',
    fontSize: 11,
    fontWeight: 900,
    flexShrink: 0,
  },
  fileName: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  previewSpinner: {
    position: 'fixed',
    inset: 0,
    zIndex: 1900,
    display: 'grid',
    placeItems: 'center',
    background: 'rgba(36, 27, 17, 0.26)',
    backdropFilter: 'blur(12px)',
  },
} satisfies Record<string, CSSProperties>;
