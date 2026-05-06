import type { CSSProperties } from 'react';
import { LuxSelect } from '@/components/common/LuxSelect';
import { PREFIX_LABELS } from '@/utils/audit-labels';
import type { OrganizationMember } from '@/stores/organization.store';

export interface AuditFiltersValue {
  action: string;
  userId: string;
  dateFrom: string;
  dateTo: string;
  q: string;
}

interface AuditFiltersProps {
  value: AuditFiltersValue;
  members: OrganizationMember[];
  exporting?: boolean;
  onChange: (next: AuditFiltersValue) => void;
  onExport: () => void;
}

const ACTION_OPTIONS = [
  { value: '', label: 'Все действия' },
  { value: 'auth', label: PREFIX_LABELS.auth },
  { value: 'org', label: PREFIX_LABELS.org },
  { value: 'member', label: PREFIX_LABELS.member },
  { value: 'chat', label: PREFIX_LABELS.chat },
  { value: 'message', label: PREFIX_LABELS.message },
  { value: 'file', label: PREFIX_LABELS.file },
  { value: 'task', label: PREFIX_LABELS.task },
];

export function AuditFilters({ value, members, exporting, onChange, onExport }: AuditFiltersProps) {
  const userOptions = [
    { value: '', label: 'Все пользователи' },
    ...members.map((m) => ({
      value: m.userId,
      label: `${m.firstName || ''} ${m.lastName || ''}`.trim() || m.email,
    })),
  ];

  const update = (patch: Partial<AuditFiltersValue>) => onChange({ ...value, ...patch });

  return (
    <section className="lux-panel" style={styles.panel}>
      <div style={styles.row}>
        <div style={styles.field}>
          <label style={styles.label}>Действие</label>
          <LuxSelect
            value={value.action}
            options={ACTION_OPTIONS}
            onChange={(v) => update({ action: v })}
            style={styles.select}
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Пользователь</label>
          <LuxSelect
            value={value.userId}
            options={userOptions}
            onChange={(v) => update({ userId: v })}
            style={styles.select}
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>С даты</label>
          <input
            type="date"
            className="lux-input"
            value={value.dateFrom}
            onChange={(e) => update({ dateFrom: e.target.value })}
            style={styles.input}
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>По дату</label>
          <input
            type="date"
            className="lux-input"
            value={value.dateTo}
            onChange={(e) => update({ dateTo: e.target.value })}
            style={styles.input}
          />
        </div>
        <div style={{ ...styles.field, flex: 1, minWidth: 200 }}>
          <label style={styles.label}>Поиск</label>
          <input
            type="search"
            className="lux-input"
            placeholder="email, ID объекта, действие"
            value={value.q}
            onChange={(e) => update({ q: e.target.value })}
            style={styles.input}
          />
        </div>
        <div style={styles.actions}>
          <button
            className="lux-button-secondary"
            type="button"
            onClick={onExport}
            disabled={exporting}
          >
            {exporting ? 'Экспорт…' : 'Экспорт CSV'}
          </button>
        </div>
      </div>
    </section>
  );
}

const styles = {
  panel: {
    padding: 16,
    position: 'relative',
    zIndex: 50,
    overflow: 'visible',
  },
  row: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'flex-end',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    minWidth: 180,
  },
  label: {
    fontSize: 11,
    fontWeight: 800,
    color: 'var(--color-text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  select: {
    minWidth: 180,
  },
  input: {
    height: 38,
  },
  actions: {
    display: 'flex',
    alignItems: 'flex-end',
  },
} satisfies Record<string, CSSProperties>;
