import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Avatar } from '@/components/common/Avatar';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useOrganizationStore } from '@/stores/organization.store';
import * as tasksApi from '@/api/tasks.api';

type Task = tasksApi.Task & {
  status?: string;
  priority?: string;
  assignedTo?: unknown;
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'Все' },
  { value: 'todo', label: 'Новые' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'review', label: 'На проверке' },
  { value: 'done', label: 'Готово' },
];

const STATUS_LABELS: Record<string, string> = {
  todo: 'Новая',
  new: 'Новая',
  in_progress: 'В работе',
  in_review: 'На проверке',
  review: 'На проверке',
  done: 'Готово',
  cancelled: 'Отменена',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  urgent: 'Срочно',
};

const STATUS_TONES: Record<string, { bg: string; fg: string; border: string }> = {
  todo: { bg: 'rgba(124, 132, 147, 0.13)', fg: '#5f6674', border: 'rgba(124, 132, 147, 0.22)' },
  new: { bg: 'rgba(124, 132, 147, 0.13)', fg: '#5f6674', border: 'rgba(124, 132, 147, 0.22)' },
  in_progress: { bg: 'rgba(212, 177, 106, 0.18)', fg: '#7a5a16', border: 'rgba(212, 177, 106, 0.28)' },
  in_review: { bg: 'rgba(92, 135, 117, 0.14)', fg: '#315f50', border: 'rgba(92, 135, 117, 0.22)' },
  review: { bg: 'rgba(92, 135, 117, 0.14)', fg: '#315f50', border: 'rgba(92, 135, 117, 0.22)' },
  done: { bg: 'rgba(42, 153, 101, 0.13)', fg: '#24744f', border: 'rgba(42, 153, 101, 0.22)' },
  cancelled: { bg: 'rgba(201, 78, 78, 0.12)', fg: '#9a3737', border: 'rgba(201, 78, 78, 0.2)' },
};

const PRIORITY_TONES: Record<string, string> = {
  low: '#7b8490',
  medium: '#5c8775',
  high: '#b4832e',
  urgent: '#c94e4e',
};

function normalizeKey(value?: string) {
  return (value ?? '').toLowerCase();
}

function getStatusLabel(status?: string) {
  const key = normalizeKey(status);
  return STATUS_LABELS[key] ?? status ?? 'Без статуса';
}

function getPriorityLabel(priority?: string) {
  const key = normalizeKey(priority);
  return PRIORITY_LABELS[key] ?? priority ?? 'Обычный';
}

function getAssigneeName(task: Task) {
  if (task.assigneeName) return task.assigneeName;

  const assignedTo = task.assignedTo as
    | { firstName?: string; lastName?: string; email?: string }
    | string
    | undefined;

  if (typeof assignedTo === 'string') return '';
  if (!assignedTo) return '';

  return [assignedTo.firstName, assignedTo.lastName].filter(Boolean).join(' ') || assignedTo.email || '';
}

function formatDate(value?: string) {
  if (!value) return '';
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function TasksPage() {
  const { currentOrg } = useOrganizationStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!currentOrg) return;

    setLoading(true);
    setError('');
    const filters = statusFilter !== 'all' ? { status: statusFilter } : undefined;

    tasksApi
      .getTasks(currentOrg.id, filters)
      .then((res) => setTasks(res as Task[]))
      .catch(() => {
        setError('Раздел задач временно недоступен. Попробуйте обновить страницу чуть позже.');
        setTasks([]);
      })
      .finally(() => setLoading(false));
  }, [currentOrg, statusFilter]);

  const stats = useMemo(() => {
    const active = tasks.filter((task) => {
      const status = normalizeKey(task.status);
      return status === 'in_progress' || status === 'review' || status === 'in_review';
    }).length;
    const urgent = tasks.filter((task) => normalizeKey(task.priority) === 'urgent').length;
    const done = tasks.filter((task) => normalizeKey(task.status) === 'done').length;

    return { active, urgent, done };
  }, [tasks]);

  return (
    <div className="page-shell">
      <div className="page-shell__inner">
        <section className="lux-panel page-hero">
          <div className="page-hero__copy">
            <div className="page-hero__kicker">Контроль исполнения</div>
            <h1 className="page-hero__title">Задачи без шума и хаоса.</h1>
            <p className="page-hero__description">
              Все поручения, сроки и ответственные собраны в одной спокойной ленте, чтобы команда двигалась точно и без лишних переключений.
            </p>
            <div className="page-hero__meta">
              <span className="lux-pill">Всего: {tasks.length}</span>
              <span className="lux-pill">В фокусе: {stats.active}</span>
              <span className="lux-pill">Срочно: {stats.urgent}</span>
              <span className="lux-pill">Готово: {stats.done}</span>
            </div>
          </div>
          <div className="page-hero__actions">
            <button className="lux-button" type="button" title="Создание задач появится в следующем релизе">
              Новая задача
            </button>
          </div>
        </section>

        <section className="lux-panel" style={{ padding: 16 }}>
          <div style={styles.filters}>
            {STATUS_OPTIONS.map((status) => (
              <button
                key={status.value}
                className={statusFilter === status.value ? 'lux-chip is-active' : 'lux-chip'}
                onClick={() => setStatusFilter(status.value)}
              >
                {status.label}
              </button>
            ))}
          </div>

          {error && <div className="lux-alert" style={{ marginBottom: 14 }}>{error}</div>}

          {loading ? (
            <div style={styles.centered}>
              <LoadingSpinner />
            </div>
          ) : tasks.length === 0 ? (
            <EmptyState
              title="Пока задач нет"
              description="Как только появятся поручения, они аккуратно встанут в эту ленту."
            />
          ) : (
            <div className="collection-list">
              {tasks.map((task) => {
                const status = normalizeKey(task.status);
                const priority = normalizeKey(task.priority);
                const tone = STATUS_TONES[status] ?? STATUS_TONES.todo;
                const assigneeName = getAssigneeName(task);

                return (
                  <article key={task.id} className="list-card">
                    <div style={{ ...styles.statusMark, color: tone.fg, borderColor: tone.border, background: tone.bg }}>
                      {getStatusLabel(task.status)}
                    </div>
                    <div className="list-card__body">
                      <div className="list-card__title">{task.title}</div>
                      {task.description && (
                        <div className="list-card__subtitle" style={styles.description}>
                          {task.description}
                        </div>
                      )}
                      <div className="list-card__meta">
                        <span style={{ color: PRIORITY_TONES[priority] ?? PRIORITY_TONES.medium }}>
                          Приоритет: {getPriorityLabel(task.priority)}
                        </span>
                        {task.dueDate && <span>Срок: {formatDate(task.dueDate)}</span>}
                        <span>Создано: {formatDate(task.createdAt)}</span>
                      </div>
                    </div>
                    {assigneeName ? (
                      <div style={styles.assignee}>
                        <Avatar name={assigneeName} src={task.assigneeAvatar} size="sm" />
                        <span>{assigneeName}</span>
                      </div>
                    ) : (
                      <span className="lux-pill">Без исполнителя</span>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

const styles = {
  filters: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  centered: {
    display: 'flex',
    justifyContent: 'center',
    padding: 32,
  },
  statusMark: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 104,
    padding: '8px 12px',
    border: '1px solid',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
  },
  description: {
    marginTop: 6,
    maxWidth: 680,
  },
  assignee: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    minWidth: 150,
    justifyContent: 'flex-end',
    color: 'var(--color-text-secondary)',
    fontSize: 12,
    fontWeight: 700,
  },
} satisfies Record<string, CSSProperties>;
