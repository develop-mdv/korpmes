import React, { useEffect, useState, useCallback } from 'react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { useOrganizationStore } from '@/stores/organization.store';
import * as auditApi from '@/api/audit.api';
import { formatDistanceToNow, format } from 'date-fns';

type AuditLog = auditApi.AuditLogItem;

// Colour-code action categories
function actionColor(action: string): string {
  if (action.startsWith('auth')) return '#4F46E5';
  if (action.startsWith('message') || action.startsWith('chat')) return '#10B981';
  if (action.startsWith('file')) return '#F59E0B';
  if (action.startsWith('task')) return '#8B5CF6';
  if (action.startsWith('member') || action.startsWith('org')) return '#EF4444';
  return '#6B7280';
}

function ActionBadge({ action }: { action: string }) {
  return (
    <span
      style={{
        ...styles.badge,
        background: `${actionColor(action)}22`,
        color: actionColor(action),
        border: `1px solid ${actionColor(action)}55`,
      }}
    >
      {action}
    </span>
  );
}

const ACTION_GROUPS = ['', 'auth', 'message', 'file', 'task', 'member', 'org', 'chat'];

function LogRow({ log }: { log: AuditLog }) {
  const [showMeta, setShowMeta] = useState(false);
  const hasMeta = log.metadata && Object.keys(log.metadata).length > 0;

  return (
    <>
      <tr style={styles.tr}>
        <td style={styles.td}>
          <span title={format(new Date(log.createdAt), 'PPpp')} style={styles.time}>
            {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
          </span>
        </td>
        <td style={styles.td}>
          <span style={styles.email}>{log.userEmail || log.userId.slice(0, 8)}</span>
        </td>
        <td style={styles.td}>
          <ActionBadge action={log.action} />
        </td>
        <td style={styles.td}>
          {log.entityType && (
            <span style={styles.entity}>
              {log.entityType}
              {log.entityId && <span style={styles.entityId}> #{log.entityId.slice(0, 8)}</span>}
            </span>
          )}
        </td>
        <td style={styles.td}>{log.ipAddress || '—'}</td>
        <td style={styles.td}>
          {hasMeta && (
            <button style={styles.metaBtn} onClick={() => setShowMeta((v) => !v)}>
              {showMeta ? '▲' : '▼'} meta
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
  const LIMIT = 50;

  const fetch = useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      const res = await auditApi.getAuditLogs({
        orgId: currentOrg.id,
        page,
        limit: LIMIT,
        action: actionFilter || undefined,
      });
      setLogs(res.items);
      setPages(res.pages);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, [currentOrg, page, actionFilter]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleFilterChange = (v: string) => {
    setActionFilter(v);
    setPage(1);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Audit Log</h1>
        {!loading && <span style={styles.count}>{total} events</span>}
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <select
          style={styles.select}
          value={actionFilter}
          onChange={(e) => handleFilterChange(e.target.value)}
        >
          <option value="">All actions</option>
          {ACTION_GROUPS.filter(Boolean).map((g) => (
            <option key={g} value={g}>{g}.*</option>
          ))}
        </select>
      </div>

      {loading && <div style={styles.centered}><LoadingSpinner /></div>}

      {!loading && logs.length === 0 && (
        <EmptyState title="No audit events" description="Activity will appear here" />
      )}

      {!loading && logs.length > 0 && (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                {['Time', 'User', 'Action', 'Entity', 'IP', ''].map((h) => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => <LogRow key={log.id} log={log} />)}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div style={styles.pagination}>
          <button
            style={{ ...styles.pageBtn, ...(page <= 1 ? styles.pageBtnDisabled : {}) }}
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Prev
          </button>
          <span style={styles.pageInfo}>{page} / {pages}</span>
          <button
            style={{ ...styles.pageBtn, ...(page >= pages ? styles.pageBtnDisabled : {}) }}
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: 'clamp(12px, 4vw, 24px)', maxWidth: 1200, margin: '0 auto' },
  header: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--color-text)' },
  count: { fontSize: 14, color: 'var(--color-text-secondary)' },
  filters: { display: 'flex', gap: 10, marginBottom: 16 },
  select: {
    padding: '7px 12px', borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)', background: 'var(--color-surface)',
    color: 'var(--color-text)', fontSize: 13, cursor: 'pointer',
  },
  centered: { display: 'flex', justifyContent: 'center', paddingTop: 40 },
  tableWrap: { overflowX: 'auto', borderRadius: 8, border: '1px solid var(--color-border)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: {
    padding: '10px 14px', textAlign: 'left', fontWeight: 600,
    background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)',
    borderBottom: '1px solid var(--color-border)', whiteSpace: 'nowrap',
  },
  tr: { borderBottom: '1px solid var(--color-border)' },
  td: { padding: '10px 14px', verticalAlign: 'middle', color: 'var(--color-text)' },
  time: { color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', fontSize: 12, cursor: 'default' },
  email: { fontWeight: 500 },
  badge: {
    display: 'inline-block', padding: '2px 8px', borderRadius: 10,
    fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
  },
  entity: { fontSize: 12, color: 'var(--color-text-secondary)' },
  entityId: { opacity: 0.6 },
  metaBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--color-text-secondary)', fontSize: 11, padding: '2px 6px',
  },
  metaCell: { background: 'var(--color-bg-secondary)', padding: 0 },
  metaPre: {
    margin: 0, padding: '10px 20px', fontSize: 11, fontFamily: 'monospace',
    color: 'var(--color-text)', overflowX: 'auto', maxHeight: 200,
  },
  pagination: { display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', marginTop: 20 },
  pageBtn: {
    padding: '7px 16px', borderRadius: 6, border: '1px solid var(--color-border)',
    background: 'var(--color-surface)', color: 'var(--color-text)', cursor: 'pointer', fontSize: 13,
  },
  pageBtnDisabled: { opacity: 0.4, cursor: 'not-allowed' },
  pageInfo: { fontSize: 13, color: 'var(--color-text-secondary)' },
};
