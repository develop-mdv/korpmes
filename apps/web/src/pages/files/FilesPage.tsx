import { useCallback, useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import * as filesApi from '@/api/files.api';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { FilePreviewModal } from '@/components/files/FilePreviewModal';
import { useOrganizationStore } from '@/stores/organization.store';

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
  ) {
    return 'documents';
  }
  return 'other';
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isPreviewable(mimeType: string) {
  if (mimeType.startsWith('image/') || mimeType.startsWith('video/') || mimeType.startsWith('audio/') || mimeType.startsWith('text/')) return true;
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

const categories: FileCategory[] = ['images', 'documents', 'video', 'audio', 'other'];
const categoryLabels: Record<FileCategory, string> = {
  images: 'Изображения',
  documents: 'Документы',
  video: 'Видео',
  audio: 'Аудио',
  other: 'Другое',
};

export function FilesPage() {
  const { currentOrg } = useOrganizationStore();
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<FileCategory | 'all'>('all');
  const [previewFile, setPreviewFile] = useState<FileInfo | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (!currentOrg) return;

    filesApi.listFiles({ orgId: currentOrg.id }).then(setFiles).finally(() => setLoading(false));
  }, [currentOrg]);

  const handleDownload = useCallback(async (id: string) => {
    const { url } = await filesApi.getDownloadUrl(id);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.click();
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

  const grouped = files.reduce<Record<FileCategory, FileInfo[]>>(
    (accumulator, file) => {
      accumulator[getCategory(file.mimeType)].push(file);
      return accumulator;
    },
    { images: [], documents: [], video: [], audio: [], other: [] },
  );

  const visibleCategories =
    activeCategory === 'all'
      ? categories.filter((category) => grouped[category].length > 0)
      : grouped[activeCategory].length > 0
        ? [activeCategory]
        : [];

  return (
    <div className="page-shell">
      <div className="page-shell__inner">
        <section className="lux-panel page-hero">
          <div className="page-hero__copy">
            <div className="page-hero__kicker">Файлы</div>
            <h1 className="page-hero__title">Общее хранилище в чистом светлом исполнении.</h1>
            <p className="page-hero__description">
              Просматривайте документы, изображения, видео и другие материалы из чатов и задач в одном месте.
            </p>
          </div>
          <div className="page-hero__meta">
            <span className="lux-pill">{files.length} файлов</span>
          </div>
        </section>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {(['all', ...categories] as const).map((category) => {
            const count = category === 'all' ? files.length : grouped[category].length;
            if (category !== 'all' && count === 0) return null;

            return (
              <button
                key={category}
                className={activeCategory === category ? 'lux-chip is-active' : 'lux-chip'}
                onClick={() => setActiveCategory(category)}
              >
                {category === 'all' ? 'Все' : categoryLabels[category]}
                <span>{count}</span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <section className="lux-panel" style={{ padding: 28 }}>
            <LoadingSpinner />
          </section>
        ) : files.length === 0 ? (
          <section className="lux-panel" style={{ minHeight: 360 }}>
            <EmptyState title="Пока файлов нет" description="Все отправленные материалы появятся здесь автоматически." />
          </section>
        ) : (
          <div className="page-grid">
            {visibleCategories.map((category) => (
              <section key={category} className="lux-panel" style={{ padding: 18 }}>
                <div className="page-hero__kicker" style={{ marginBottom: 14 }}>{categoryLabels[category]}</div>
                <div className="collection-list">
                  {grouped[category].map((file) => (
                    <div key={file.id} className="list-card">
                      <div className="brand-mark" style={{ width: 48, height: 48, fontSize: 18 }}>
                        {file.originalName.charAt(0).toUpperCase()}
                      </div>
                      <div className="list-card__body">
                        <div className="list-card__title">{file.originalName}</div>
                        <div className="list-card__meta">
                          <span>{formatSize(file.sizeBytes)}</span>
                          <span>{formatDistanceToNow(new Date(file.createdAt), { addSuffix: true, locale: ru })}</span>
                        </div>
                      </div>
                      <div className="list-card__actions">
                        {isPreviewable(file.mimeType) && (
                          <button className="lux-button-secondary" onClick={() => handlePreview(file)}>
                            Просмотр
                          </button>
                        )}
                        <button className="lux-button" onClick={() => handleDownload(file.id)}>
                          Скачать
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {previewFile && !previewLoading && previewUrl && (
        <FilePreviewModal file={previewFile} signedUrl={previewUrl} onClose={() => { setPreviewFile(null); setPreviewUrl(''); }} />
      )}
      {previewLoading && <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(2,4,8,0.4)' }}><LoadingSpinner /></div>}
    </div>
  );
}
