import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import type { AuditLogItem } from '@/api/audit.api';
import type { OrganizationMember } from '@/stores/organization.store';
import { AuditRow } from './AuditRow';

interface AuditTableProps {
  logs: AuditLogItem[];
  members: OrganizationMember[];
}

export function AuditTable({ logs, members }: AuditTableProps) {
  const memberByUserId = useMemo(() => {
    const map = new Map<string, OrganizationMember>();
    for (const m of members) map.set(m.userId, m);
    return map;
  }, [members]);

  return (
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
            <AuditRow key={log.id} log={log} member={memberByUserId.get(log.userId)} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
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
} satisfies Record<string, CSSProperties>;
