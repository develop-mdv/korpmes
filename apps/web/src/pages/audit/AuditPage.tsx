import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { LuxSelect } from '@/components/common/LuxSelect';
import { useOrganizationStore } from '@/stores/organization.store';
import * as auditApi from '@/api/audit.api';

type AuditLog = auditApi.AuditLogItem;

const ACTION_GROUPS = [
  { value: '', label: 'Все действия' },
  { value: 'auth', label: 'Авторизация' },
  { value: 'message', label: 'Сообщения' },
  { value: 'file', label: 'Файлы' },
  { value: 'task', label: 'Задачи' },
  { value: 'member', label: 'Участники' },
  { value: 'org', label: 'Организация' },
  { value: 'chat', label: 'Чаты' },
];

function actionTone(action: string) {
  if (action.startsWith('auth')) return { color: '#5c6f96', bg: 'rgba(92, 111, 150, 0.12)' };
  if (action.startsWith('message') || action.startsWith('chat')) return { color: '#315f50', bg: 'rgba(92, 135, 117, 0.14)' };
  if (action.startsWith('file')) return { color: '#7a5a16', bg: 'rgba(212, 177, 106, 0.18)' };
  if (action.startsWith('task')) return { color: '#6b5a8f', bg: 'rgba(132, 111, 170, 0.13)' };
  if (action.startsWith('member') || action.startsWith('org')) return { color: '#9a3737', bg: 'rgba(201, 78, 78, 0.12)' };
  return { color: '#5f6674', bg: 'rgba(124, 132, 147, 0.13)' };
}

function ActionBadge({ action }: { action: string }) {
  const tone = actionTone(action);

  return (
    <span style={{ ...styles.badge, color: tone.color, background: tone.bg }}>
      {action}
    </span>
  );
}

function LogRow({ log }: { log: AuditLog }) {
  const [showMeta, setShowMeta] = useState(false);
  const hasMeta = Boolean(log.metadata && Object.keys(log.metadata).length > 0);

  return (
    <>
      <tr style={styles.tr}>
        <td style={styles.td}>
          <span title={format(new Date(log.createdAt), 'd MMM yyyy, HH:mm', { locale: ru })} style={styles.time}>
            {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: ru })}
          </span>
        </td>
        <td style={styles.td}>
          <span style={styles.email}>{log.userEmail || log.userId.slice(0, 8)}</span>
        </td>
        <td style={styles.td}>
          <ActionBadge action={log.action} />
        </td>
        <td style={styles.td}>
          {log.entityType ? (
            <span style={styles.entity}>
              {log.entityType}
              {log.entityId && <span style={styles.entityId}> #{log.entityId.slice(0, 8)}</span>}
            </span>
          ) : (
            <span style={styles.entity}>-</span>
          )}
        </td>
        <td style={styles.td}>{log.ipAddress || '-'}</td>
        <td style={styles.td}>
          {hasMeta && (
            <button style={styles.metaBtn} onClick={() => setShowMeta((value) => !value)} type="button">
              {showMeta ? 'Скрыть детали' : 'Детали'}
            </button>
          )}
        </td>
      </tr>
      {showMeta && hasMeta && (
        <tr>
          <td colSpan={6} style={styles.metaCell}>
            <pre style={styles.metaPre}>{JSON.stringify(log.metadata, null, 2)}</pre>
          </td>
        </tr>
      )}
    </>
  );
}

export function AuditPage() {
  const { currentOrg } = useOrganizationStore();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const [error, setError] = useState('');
  const limit = 50;

  const fetchLogs = useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true);
    setError('');
    try {
      const res = await auditApi.getAuditLogs({
        orgId: currentOrg.id,
        page,
        limit,
        action: actionFilter || undefined,
      });
      setLogs(res.items);
      setPages(res.pages);
      setTotal(res.total);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Не удалось загрузить журнал аудита');
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [currentOrg, page, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleFilterChange = (value: string) => {
    setActionFilter(value);
    setPage(1);
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
              <span className="lux-pill">Страница: {page} / {pages}</span>
            </div>
          </div>
        </section>

        <section className="lux-panel" style={styles.toolbar}>
          <LuxSelect
            value={actionFilter}
            onChange={handleFilterChange}
            style={styles.select}
            options={ACTION_GROUPS.map((group) => ({ value: group.value, label: group.label }))}
          />
        </section>

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
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {['Время', 'Пользователь', 'Действие', 'Объект', 'IP', ''].map((heading) => (
                      <th key={heading} style={styles.th}>
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <LogRow key={log.id} log={log} />
                  ))}
                </tbody>
              </table>
            </div>
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
            <span className="lux-pill">{page} / {pages}</span>
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
  toolbar: {
    padding: 16,
  },
  select: {
    maxWidth: 320,
  },
  centered: {
    display: 'flex',
    justifyContent: 'center',
    padding: 32,
  },
  tablePanel: {
    overflow: 'hidden',
  },
  tableWrap: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
  },
  th: {
    padding: '14px 18px',
    textAlign: 'left',
    fontWeight: 800,
    color: 'var(--color-text-secondary)',
    borderBottom: '1px solid var(--color-border)',
    whiteSpace: 'nowrap',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  tr: {
    borderBottom: '1px solid var(--color-border)',
  },
  td: {
    padding: '14px 18px',
    verticalAlign: 'middle',
    color: 'var(--color-text)',
  },
  time: {
    color: 'var(--color-text-secondary)',
    whiteSpace: 'nowrap',
    fontSize: 12,
    cursor: 'default',
  },
  email: {
    fontWeight: 700,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: 28,
    padding: '0 10px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 900,
    whiteSpace: 'nowrap',
    letterSpacing: '0.04em',
  },
  entity: {
    fontSize: 12,
    color: 'var(--color-text-secondary)',
  },
  entityId: {
    opacity: 0.65,
  },
  metaBtn: {
    border: '1px solid var(--color-border)',
    borderRadius: 999,
    background: 'var(--color-surface-soft)',
    cursor: 'pointer',
    color: 'var(--color-text-secondary)',
    fontSize: 11,
    fontWeight: 800,
    padding: '7px 10px',
  },
  metaCell: {
    background: 'rgba(255, 255, 255, 0.56)',
    padding: 0,
  },
  metaPre: {
    margin: 0,
    padding: '14px 20px',
    fontSize: 11,
    fontFamily: 'monospace',
    color: 'var(--color-text)',
    overflowX: 'auto',
    maxHeight: 220,
  },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    justifyContent: 'center',
  },
} satisfies Record<string, CSSProperties>;
