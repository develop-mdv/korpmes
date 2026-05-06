import { useState } from 'react';
import type { CSSProperties } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { actionLabel, actionTone } from '@/utils/audit-labels';
import type { AuditLogItem } from '@/api/audit.api';
import type { OrganizationMember } from '@/stores/organization.store';
import { AuditMetadata } from './AuditMetadata';

interface AuditRowProps {
  log: AuditLogItem;
  member?: OrganizationMember;
}

function fullName(member: OrganizationMember | undefined): string {
  if (!member) return '';
  const composed = `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim();
  return composed || member.email || '';
}

export function AuditRow({ log, member }: AuditRowProps) {
  const [open, setOpen] = useState(false);
  const tone = actionTone(log.action);
  const hasMeta = Boolean(log.metadata && Object.keys(log.metadata).length > 0);
  const displayName = fullName(member) || log.userEmail || log.userId.slice(0, 8);
  const subTitle = log.userEmail && fullName(member) ? log.userEmail : log.userId;

  return (
    <>
      <tr style={styles.tr}>
        <td style={styles.td}>
          <span
            title={format(new Date(log.createdAt), 'd MMM yyyy, HH:mm', { locale: ru })}
            style={styles.time}
          >
            {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: ru })}
          </span>
        </td>
        <td style={styles.td}>
          <span style={styles.email} title={log.userId}>
            {displayName}
          </span>
          <div style={styles.userSub}>{subTitle}</div>
        </td>
        <td style={styles.td}>
          <span style={{ ...styles.badge, color: tone.color, background: tone.bg }}>
            {actionLabel(log.action)}
          </span>
          <div style={styles.actionCode}>{log.action}</div>
        </td>
        <td style={styles.td}>
          {log.entityType ? (
            <span style={styles.entity}>
              {log.entityType}
              {log.entityId && <span style={styles.entityId}> #{log.entityId.slice(0, 8)}</span>}
            </span>
          ) : (
            <span style={styles.entity}>—</span>
          )}
        </td>
        <td style={styles.td}>{log.ipAddress || '—'}</td>
        <td style={styles.td}>
          {hasMeta && (
            <button style={styles.metaBtn} onClick={() => setOpen((v) => !v)} type="button">
              {open ? 'Скрыть' : 'Детали'}
            </button>
          )}
        </td>
      </tr>
      {open && hasMeta && (
        <tr>
          <td colSpan={6} style={styles.metaCell}>
            <AuditMetadata metadata={log.metadata} />
          </td>
        </tr>
      )}
    </>
  );
}

const styles = {
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
  userSub: {
    marginTop: 4,
    fontSize: 10,
    color: 'var(--color-text-secondary)',
    opacity: 0.7,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: 200,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: 26,
    padding: '0 10px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 900,
    whiteSpace: 'nowrap',
    letterSpacing: '0.04em',
  },
  actionCode: {
    marginTop: 4,
    fontSize: 10,
    color: 'var(--color-text-secondary)',
    opacity: 0.7,
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
} satisfies Record<string, CSSProperties>;
