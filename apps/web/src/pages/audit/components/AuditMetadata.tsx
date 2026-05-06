import { useState } from 'react';
import type { CSSProperties } from 'react';
import { renderMetadata } from '@/utils/audit-labels';

interface AuditMetadataProps {
  metadata: Record<string, unknown> | null;
}

export function AuditMetadata({ metadata }: AuditMetadataProps) {
  const [showRaw, setShowRaw] = useState(false);
  const fields = renderMetadata(metadata);

  if (fields.length === 0) {
    return <span style={styles.empty}>—</span>;
  }

  return (
    <div style={styles.wrap}>
      <ul style={styles.list}>
        {fields.map((field) => (
          <li key={field.label} style={styles.item}>
            <span style={styles.label}>{field.label}:</span>
            <span style={styles.value}>{field.value}</span>
          </li>
        ))}
      </ul>
      <button type="button" style={styles.toggle} onClick={() => setShowRaw((v) => !v)}>
        {showRaw ? 'Скрыть JSON' : 'Показать JSON'}
      </button>
      {showRaw && <pre style={styles.pre}>{JSON.stringify(metadata, null, 2)}</pre>}
    </div>
  );
}

const styles = {
  wrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: '12px 20px',
    background: 'rgba(255, 255, 255, 0.56)',
  },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 6,
  },
  item: {
    display: 'flex',
    gap: 6,
    fontSize: 12,
    color: 'var(--color-text)',
  },
  label: {
    color: 'var(--color-text-secondary)',
    fontWeight: 800,
  },
  value: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  toggle: {
    alignSelf: 'flex-start',
    border: '1px solid var(--color-border)',
    borderRadius: 999,
    background: 'var(--color-surface-soft)',
    cursor: 'pointer',
    color: 'var(--color-text-secondary)',
    fontSize: 11,
    fontWeight: 800,
    padding: '5px 10px',
  },
  pre: {
    margin: 0,
    padding: '10px 14px',
    fontSize: 11,
    fontFamily: 'monospace',
    color: 'var(--color-text)',
    overflowX: 'auto',
    maxHeight: 200,
    background: 'rgba(0, 0, 0, 0.04)',
    borderRadius: 8,
  },
  empty: {
    color: 'var(--color-text-secondary)',
    fontSize: 12,
  },
} satisfies Record<string, CSSProperties>;
