import React, { useEffect, useState } from 'react';
import { useOrganizationStore } from '@/stores/organization.store';
import * as tasksApi from '@/api/tasks.api';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignedTo?: { firstName: string; lastName: string };
  dueDate?: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  NEW: '#6B7280',
  IN_PROGRESS: '#3B82F6',
  IN_REVIEW: '#F59E0B',
  DONE: '#10B981',
  CANCELLED: '#EF4444',
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#9CA3AF',
  MEDIUM: '#3B82F6',
  HIGH: '#F59E0B',
  URGENT: '#EF4444',
};

export function TasksPage() {
  const { currentOrg } = useOrganizationStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentOrg) return;
    setLoading(true);
    const filters = statusFilter !== 'ALL' ? { status: statusFilter } : {};
    tasksApi.getTasks(currentOrg.id, filters).then((res) => {
      setTasks(res as unknown as Task[]);
      setLoading(false);
    });
  }, [currentOrg, statusFilter]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Tasks</h1>
        <button style={styles.createBtn}>+ New Task</button>
      </div>

      <div style={styles.filters}>
        {['ALL', 'NEW', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'].map((status) => (
          <button
            key={status}
            style={{ ...styles.filterChip, ...(statusFilter === status ? styles.filterChipActive : {}) }}
            onClick={() => setStatusFilter(status)}
          >
            {status.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={styles.loading}>Loading tasks...</p>
      ) : tasks.length === 0 ? (
        <div style={styles.empty}>
          <p style={styles.emptyText}>No tasks found</p>
        </div>
      ) : (
        <div style={styles.list}>
          {tasks.map((task) => (
            <div key={task.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={{ ...styles.statusBadge, background: STATUS_COLORS[task.status] || '#6B7280' }}>
                  {task.status.replace('_', ' ')}
                </span>
                <span style={{ ...styles.priorityDot, background: PRIORITY_COLORS[task.priority] || '#9CA3AF' }} />
              </div>
              <h3 style={styles.cardTitle}>{task.title}</h3>
              <div style={styles.cardMeta}>
                {task.assignedTo && (
                  <span style={styles.assignee}>{task.assignedTo.firstName} {task.assignedTo.lastName}</span>
                )}
                {task.dueDate && (
                  <span style={styles.dueDate}>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: 24, maxWidth: 960, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--color-text)' },
  createBtn: { padding: '10px 20px', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--color-primary)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  filters: { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  filterChip: { padding: '6px 14px', borderRadius: 'var(--radius-full)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', fontSize: 13, cursor: 'pointer', color: 'var(--color-text-secondary)' },
  filterChipActive: { background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' },
  loading: { color: 'var(--color-text-secondary)', textAlign: 'center', padding: 40 },
  empty: { textAlign: 'center', padding: 60 },
  emptyText: { color: 'var(--color-text-tertiary)', fontSize: 16 },
  list: { display: 'grid', gap: 12 },
  card: { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 16 },
  cardHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  statusBadge: { fontSize: 11, fontWeight: 600, color: '#fff', padding: '2px 8px', borderRadius: 'var(--radius-full)', textTransform: 'uppercase' },
  priorityDot: { width: 8, height: 8, borderRadius: '50%' },
  cardTitle: { fontSize: 16, fontWeight: 600, margin: 0, color: 'var(--color-text)' },
  cardMeta: { display: 'flex', gap: 16, marginTop: 8, fontSize: 13, color: 'var(--color-text-secondary)' },
  assignee: {},
  dueDate: {},
};
