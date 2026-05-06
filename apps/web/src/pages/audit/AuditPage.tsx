import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useOrganizationStore } from '@/stores/organization.store';
import { useAuditLiveLog } from '@/hooks/useAuditLiveLog';
import * as auditApi from '@/api/audit.api';
import type { AuditLogItem } from '@/api/audit.api';
import { AuditFilters, type AuditFiltersValue } from './components/AuditFilters';
import { AuditTable } from './components/AuditTable';

const EMPTY_FILTERS: AuditFiltersValue = {
  action: '',
  userId: '',
  dateFrom: '',
  dateTo: '',
  q: '',
};

const LIMIT = 50;
const SEARCH_DEBOUNCE_MS = 350;

function matchesFilters(log: AuditLogItem, filters: AuditFiltersValue): boolean {
  if (filters.action && !log.action.startsWith(filters.action)) return false;
  if (filters.userId && log.userId !== filters.userId) return false;
  if (filters.dateFrom) {
    const d = new Date(log.createdAt);
    if (d < new Date(filters.dateFrom)) return false;
  }
  if (filters.dateTo) {
    const d = new Date(log.createdAt);
    if (d > new Date(`${filters.dateTo}T23:59:59`)) return false;
  }
  if (filters.q) {
    const q = filters.q.toLowerCase();
    const blob = `${log.userEmail ?? ''} ${log.entityId ?? ''} ${log.action}`.toLowerCase();
    if (!blob.includes(q)) return false;
  }
  return true;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function AuditPage() {
  const { currentOrg, members } = useOrganizationStore();
  const [filters, setFilters] = useState<AuditFiltersValue>(EMPTY_FILTERS);
  const [debouncedQ, setDebouncedQ] = useState('');
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [pendingLive, setPendingLive] = useState<AuditLogItem[]>([]);

  // Debounce free-text search separately to avoid hammering the API on each keystroke.
  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedQ(filters.q), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [filters.q]);

  const effectiveFilters = useMemo(
    () => ({ ...filters, q: debouncedQ }),
    [filters.action, filters.userId, filters.dateFrom, filters.dateTo, debouncedQ],
  );

  // Reset to page 1 whenever a filter (other than page itself) changes.
  const filtersKey = `${effectiveFilters.action}|${effectiveFilters.userId}|${effectiveFilters.dateFrom}|${effectiveFilters.dateTo}|${effectiveFilters.q}`;
  const lastFiltersKey = useRef(filtersKey);
  useEffect(() => {
    if (lastFiltersKey.current !== filtersKey) {
      lastFiltersKey.current = filtersKey;
      setPage(1);
    }
  }, [filtersKey]);

  const fetchLogs = useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true);
    setError('');
    try {
      const res = await auditApi.getAuditLogs({
        orgId: currentOrg.id,
        page,
        limit: LIMIT,
        action: effectiveFilters.action || undefined,
        userId: effectiveFilters.userId || undefined,
        dateFrom: effectiveFilters.dateFrom || undefined,
        dateTo: effectiveFilters.dateTo
          ? `${effectiveFilters.dateTo}T23:59:59`
          : undefined,
        q: effectiveFilters.q || undefined,
      });
      setLogs(res.items);
      setPages(res.pages);
      setTotal(res.total);
      setPendingLive([]);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Не удалось загрузить журнал аудита');
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [currentOrg, page, effectiveFilters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleLiveLog = useCallback(
    (log: AuditLogItem) => {
      // Only auto-prepend if currently on page 1 AND log matches current filters.
      if (page === 1 && matchesFilters(log, effectiveFilters)) {
        setLogs((prev) => [log, ...prev].slice(0, LIMIT));
        setTotal((t) => t + 1);
      } else {
        setPendingLive((prev) => [log, ...prev]);
      }
    },
    [page, effectiveFilters],
  );

  useAuditLiveLog(currentOrg?.id ?? null, handleLiveLog);

  const handleExport = useCallback(async () => {
    if (!currentOrg) return;
    setExporting(true);
    try {
      const blob = await auditApi.exportAuditLogs({
        orgId: currentOrg.id,
        action: effectiveFilters.action || undefined,
        userId: effectiveFilters.userId || undefined,
        dateFrom: effectiveFilters.dateFrom || undefined,
        dateTo: effectiveFilters.dateTo
          ? `${effectiveFilters.dateTo}T23:59:59`
          : undefined,
        q: effectiveFilters.q || undefined,
      });
      downloadBlob(blob, `audit-${currentOrg.id}-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Не удалось экспортировать журнал');
    } finally {
      setExporting(false);
    }
  }, [currentOrg, effectiveFilters]);

  const handleApplyPending = () => {
    fetchLogs();
  };

  return (
    <div className="page-shell">
      <div className="page-shell__inner" style={{ width: 'min(100%, 1200px)' }}>
        <section className="lux-panel page-hero">
          <div className="page-hero__copy">
            <div className="page-hero__kicker">Безопасность</div>
            <h1 className="page-hero__title">Журнал аудита.</h1>
            <p className="page-hero__description">
              Прозрачная история действий в организации: входы, сообщения, файлы, задачи и изменения доступа.
            </p>
            <div className="page-hero__meta">
              <span className="lux-pill">Событий: {total}</span>
              <span className="lux-pill">
                Страница: {page} / {pages}
              </span>
            </div>
          </div>
        </section>

        <AuditFilters
          value={filters}
          members={members}
          exporting={exporting}
          onChange={setFilters}
          onExport={handleExport}
        />

        {pendingLive.length > 0 && (
          <button type="button" className="lux-pill" style={styles.liveBadge} onClick={handleApplyPending}>
            Новых событий: {pendingLive.length} — обновить
          </button>
        )}

        {error && <div className="lux-alert">{error}</div>}

        <section className="lux-panel table-shell" style={styles.tablePanel}>
          {loading ? (
            <div style={styles.centered}>
              <LoadingSpinner />
            </div>
          ) : logs.length === 0 ? (
            <EmptyState
              title="Событий пока нет"
              description="Активность организации появится здесь после первых действий команды."
            />
          ) : (
            <AuditTable logs={logs} members={members} />
          )}
        </section>

        {pages > 1 && (
          <div style={styles.pagination}>
            <button
              className="lux-button-secondary"
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
              type="button"
            >
              Назад
            </button>
            <span className="lux-pill">
              {page} / {pages}
            </span>
            <button
              className="lux-button-secondary"
              disabled={page >= pages}
              onClick={() => setPage((value) => value + 1)}
              type="button"
            >
              Вперёд
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  centered: {
    display: 'flex',
    justifyContent: 'center',
    padding: 32,
  },
  tablePanel: {
    overflow: 'hidden',
  },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    justifyContent: 'center',
  },
  liveBadge: {
    alignSelf: 'flex-start',
    cursor: 'pointer',
    border: 'none',
  },
} satisfies Record<string, CSSProperties>;
