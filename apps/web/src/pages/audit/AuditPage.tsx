import { useCallback, useEffect, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import * as auditApi from '@/api/audit.api';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useOrganizationStore } from '@/stores/organization.store';

type AuditLog = auditApi.AuditLogItem;

const actionGroups = ['', 'auth', 'message', 'file', 'task', 'member', 'org', 'chat'];

export function AuditPage() {
  const { currentOrg } = useOrganizationStore();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const limit = 50;

  const fetchLogs = useCallback(async () => {
    if (!currentOrg) return;

    setLoading(true);
    try {
      const response = await auditApi.getAuditLogs({
        orgId: currentOrg.id,
        page,
        limit,
        action: actionFilter || undefined,
      });
      setLogs(response.items);
      setPages(response.pages);
      setTotal(response.total);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, currentOrg, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="page-shell">
      <div className="page-shell__inner">
        <section className="lux-panel page-hero">
          <div className="page-hero__copy">
            <div className="page-hero__kicker">Аудит</div>
            <h1 className="page-hero__title">Журнал событий без компромиссов по читаемости.</h1>
            <p className="page-hero__description">
              Отслеживайте системные действия, работу пользователей и изменения внутри организации.
            </p>
            <div className="page-hero__meta">
              <span className="lux-pill">{total} событий</span>
            </div>
          </div>
          <div className="page-hero__actions">
            <select
              className="lux-select"
              style={{ minWidth: 180 }}
              value={actionFilter}
              onChange={(event) => {
                setActionFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Все действия</option>
              {actionGroups.filter(Boolean).map((group) => (
                <option key={group} value={group}>
                  {group}.*
                </option>
              ))}
            </select>
          </div>
        </section>

        {loading ? (
          <section className="lux-panel" style={{ padding: 28 }}>
            <LoadingSpinner />
          </section>
        ) : logs.length === 0 ? (
          <section className="lux-panel" style={{ minHeight: 340 }}>
            <EmptyState title="Событий пока нет" description="Когда в системе появится активность, она будет отражена здесь." />
          </section>
        ) : (
          <section className="lux-panel table-shell">
            <div
              className="table-shell__header"
              style={{ gridTemplateColumns: '180px minmax(180px, 1fr) minmax(160px, 1fr) minmax(160px, 1fr) 120px' }}
            >
              <span>Время</span>
              <span>Пользователь</span>
              <span>Действие</span>
              <span>Сущность</span>
              <span>IP</span>
            </div>

            {logs.map((log) => (
              <div
                key={log.id}
                className="table-shell__row"
                style={{ gridTemplateColumns: '180px minmax(180px, 1fr) minmax(160px, 1fr) minmax(160px, 1fr) 120px' }}
                title={format(new Date(log.createdAt), 'PPpp', { locale: ru })}
              >
                <span className="list-card__subtitle">{formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: ru })}</span>
                <span>{log.userEmail || log.userId.slice(0, 8)}</span>
                <span className="lux-pill">{log.action}</span>
                <span className="list-card__subtitle">
                  {log.entityType || '—'} {log.entityId ? `#${log.entityId.slice(0, 8)}` : ''}
                </span>
                <span className="list-card__subtitle">{log.ipAddress || '—'}</span>
              </div>
            ))}
          </section>
        )}

        {pages > 1 && (
          <div className="form-actions">
            <button className="lux-button-secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
              Назад
            </button>
            <span className="lux-pill">{page} / {pages}</span>
            <button className="lux-button-secondary" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>
              Вперёд
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
