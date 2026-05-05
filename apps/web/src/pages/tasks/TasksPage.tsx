import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '@/components/common/Avatar';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';
import { useOrganizationStore } from '@/stores/organization.store';
import { getSocket } from '@/socket/socket';
import * as tasksApi from '@/api/tasks.api';
import { TaskPriority, TaskStatus, type Task } from '@/api/tasks.api';

type ViewMode = 'all' | 'my';

const STATUS_OPTIONS: { value: TaskStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Все' },
  { value: TaskStatus.NEW, label: 'Новые' },
  { value: TaskStatus.IN_PROGRESS, label: 'В работе' },
  { value: TaskStatus.IN_REVIEW, label: 'На проверке' },
  { value: TaskStatus.DONE, label: 'Готово' },
  { value: TaskStatus.CANCELLED, label: 'Отменены' },
];

const PRIORITY_OPTIONS: { value: TaskPriority | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Любой' },
  { value: TaskPriority.URGENT, label: 'Срочный' },
  { value: TaskPriority.HIGH, label: 'Высокий' },
  { value: TaskPriority.MEDIUM, label: 'Средний' },
  { value: TaskPriority.LOW, label: 'Низкий' },
];

const STATUS_LABELS: Record<string, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  in_review: 'На проверке',
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
  new: { bg: 'rgba(124, 132, 147, 0.13)', fg: '#5f6674', border: 'rgba(124, 132, 147, 0.22)' },
  in_progress: { bg: 'rgba(212, 177, 106, 0.18)', fg: '#7a5a16', border: 'rgba(212, 177, 106, 0.28)' },
  in_review: { bg: 'rgba(92, 135, 117, 0.14)', fg: '#315f50', border: 'rgba(92, 135, 117, 0.22)' },
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
  return STATUS_LABELS[normalizeKey(status)] ?? status ?? 'Без статуса';
}

function getPriorityLabel(priority?: string) {
  return PRIORITY_LABELS[normalizeKey(priority)] ?? priority ?? 'Обычный';
}

function getAssigneeName(task: Task) {
  if (!task.assignedToUser) return '';
  return (
    [task.assignedToUser.firstName, task.assignedToUser.lastName].filter(Boolean).join(' ') ||
    task.assignedToUser.email ||
    ''
  );
}

function formatDate(value?: string | null) {
  if (!value) return '';
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function TasksPage() {
  const { currentOrg } = useOrganizationStore();
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [myBuckets, setMyBuckets] = useState<{ assigned: Task[]; created: Task[]; watching: Task[] }>(
    { assigned: [], created: [], watching: [] },
  );
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'ALL'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!currentOrg) return;
    setLoading(true);
    setError('');

    const handleError = () => {
      setError('Раздел задач временно недоступен. Попробуйте обновить страницу чуть позже.');
    };

    if (viewMode === 'my') {
      tasksApi
        .getMyTasks(currentOrg.id)
        .then((res) => setMyBuckets(res))
        .catch(() => {
          setMyBuckets({ assigned: [], created: [], watching: [] });
          handleError();
        })
        .finally(() => setLoading(false));
    } else {
      const filters: tasksApi.TaskFilters = {};
      if (statusFilter !== 'ALL') filters.status = statusFilter;
      if (priorityFilter !== 'ALL') filters.priority = priorityFilter;

      tasksApi
        .getTasks(currentOrg.id, filters)
        .then((res) => setAllTasks(res))
        .catch(() => {
          setAllTasks([]);
          handleError();
        })
        .finally(() => setLoading(false));
    }
  }, [currentOrg, viewMode, statusFilter, priorityFilter, reloadKey]);

  useEffect(() => {
    if (!currentOrg) return;
    const socket = getSocket();
    if (!socket.connected) socket.connect();
    socket.emit('org:join', { orgId: currentOrg.id });

    const refetch = () => setReloadKey((k) => k + 1);
    socket.on('task:created', refetch);
    socket.on('task:updated', refetch);
    socket.on('task:deleted', refetch);

    return () => {
      socket.off('task:created', refetch);
      socket.off('task:updated', refetch);
      socket.off('task:deleted', refetch);
      socket.emit('org:leave', { orgId: currentOrg.id });
    };
  }, [currentOrg]);

  const stats = useMemo(() => {
    const source = viewMode === 'my'
      ? [...myBuckets.assigned, ...myBuckets.created, ...myBuckets.watching]
      : allTasks;
    const total = source.length;
    const active = source.filter((task) => {
      const status = normalizeKey(task.status);
      return status === 'in_progress' || status === 'in_review';
    }).length;
    const urgent = source.filter((task) => normalizeKey(task.priority) === 'urgent').length;
    const done = source.filter((task) => normalizeKey(task.status) === 'done').length;
    return { total, active, urgent, done };
  }, [allTasks, myBuckets, viewMode]);

  const handleQuickDone = (task: Task, event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const nextStatus = normalizeKey(task.status) === 'done' ? TaskStatus.NEW : TaskStatus.DONE;

    const updateInList = (list: Task[]) =>
      list.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t));

    if (viewMode === 'my') {
      setMyBuckets((prev) => ({
        assigned: updateInList(prev.assigned),
        created: updateInList(prev.created),
        watching: updateInList(prev.watching),
      }));
    } else {
      setAllTasks((prev) => updateInList(prev));
    }

    tasksApi.updateTask(task.id, { status: nextStatus }).catch(() => {
      // rollback
      setReloadKey((k) => k + 1);
    });
  };

  const renderTaskCard = (task: Task) => {
    const status = normalizeKey(task.status);
    const priority = normalizeKey(task.priority);
    const tone = STATUS_TONES[status] ?? STATUS_TONES.new;
    const assigneeName = getAssigneeName(task);
    const isDone = status === 'done';

    return (
      <Link key={task.id} to={`/tasks/${task.id}`} className="list-card" style={styles.card}>
        <button
          type="button"
          aria-label={isDone ? 'Снять отметку готово' : 'Отметить как готово'}
          onClick={(e) => handleQuickDone(task, e)}
          style={{
            ...styles.checkbox,
            background: isDone ? '#24744f' : 'transparent',
            color: isDone ? '#fff' : 'transparent',
            borderColor: isDone ? '#24744f' : 'rgba(124, 132, 147, 0.4)',
          }}
        >
          ✓
        </button>
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
            <Avatar name={assigneeName} src={task.assignedToUser?.avatarUrl} size="sm" />
            <span>{assigneeName}</span>
          </div>
        ) : (
          <span className="lux-pill">Без исполнителя</span>
        )}
      </Link>
    );
  };

  const renderBucket = (label: string, items: Task[]) => {
    if (items.length === 0) return null;
    return (
      <div style={styles.bucket}>
        <div style={styles.bucketHeader}>{label} · {items.length}</div>
        <div className="collection-list">{items.map(renderTaskCard)}</div>
      </div>
    );
  };

  const isEmpty = viewMode === 'my'
    ? myBuckets.assigned.length === 0 && myBuckets.created.length === 0 && myBuckets.watching.length === 0
    : allTasks.length === 0;

  if (!currentOrg) {
    return (
      <div className="page-shell">
        <div className="page-shell__inner">
          <section className="lux-panel" style={{ padding: 32, textAlign: 'center' }}>
            <h1 className="page-hero__title" style={{ marginBottom: 12 }}>
              Сначала выберите организацию
            </h1>
            <p className="page-hero__description" style={{ marginBottom: 18 }}>
              Задачи создаются и видны внутри организации. Откройте раздел организаций или примите приглашение.
            </p>
            <Link to="/organization" className="lux-button">
              К организациям
            </Link>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="page-shell__inner">
        <section className="lux-panel page-hero">
          <div className="page-hero__copy">
            <div className="page-hero__kicker">Контроль исполнения</div>
            <h1 className="page-hero__title">Задачи без шума и хаоса.</h1>
            <p className="page-hero__description">
              Все поручения, сроки и ответственные собраны в одной спокойной ленте — её видят все участники организации «{currentOrg.name}», чтобы команда двигалась точно и без лишних переключений.
            </p>
            <div className="page-hero__meta">
              <span className="lux-pill">Всего: {stats.total}</span>
              <span className="lux-pill">В фокусе: {stats.active}</span>
              <span className="lux-pill">Срочно: {stats.urgent}</span>
              <span className="lux-pill">Готово: {stats.done}</span>
            </div>
          </div>
          <div className="page-hero__actions">
            <button className="lux-button" type="button" onClick={() => setIsCreateOpen(true)} disabled={!currentOrg}>
              Новая задача
            </button>
          </div>
        </section>

        <section className="lux-panel" style={{ padding: 16 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <button
              className={viewMode === 'all' ? 'lux-chip is-active' : 'lux-chip'}
              onClick={() => setViewMode('all')}
            >
              Все задачи
            </button>
            <button
              className={viewMode === 'my' ? 'lux-chip is-active' : 'lux-chip'}
              onClick={() => setViewMode('my')}
            >
              Мои задачи
            </button>
          </div>
          <div style={styles.modeHint}>
            {viewMode === 'all'
              ? 'Все задачи организации — видны всем её участникам.'
              : 'Только задачи, в которых вы автор, исполнитель или наблюдатель.'}
          </div>

          {viewMode === 'all' && (
            <>
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
              <div style={styles.filters}>
                {PRIORITY_OPTIONS.map((priority) => (
                  <button
                    key={priority.value}
                    className={priorityFilter === priority.value ? 'lux-chip is-active' : 'lux-chip'}
                    onClick={() => setPriorityFilter(priority.value)}
                  >
                    {priority.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {error && <div className="lux-alert" style={{ marginBottom: 14 }}>{error}</div>}

          {loading ? (
            <div style={styles.centered}>
              <LoadingSpinner />
            </div>
          ) : isEmpty ? (
            <EmptyState
              title={viewMode === 'my' ? 'Пока нет ваших задач' : 'Пока задач нет'}
              description="Как только появятся поручения, они аккуратно встанут в эту ленту."
            />
          ) : viewMode === 'my' ? (
            <>
              {renderBucket('Назначенные мне', myBuckets.assigned)}
              {renderBucket('Созданные мной', myBuckets.created)}
              {renderBucket('Я наблюдаю', myBuckets.watching)}
            </>
          ) : (
            <div className="collection-list">{allTasks.map(renderTaskCard)}</div>
          )}
        </section>
      </div>

      <CreateTaskModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={() => setReloadKey((k) => k + 1)}
      />
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
  card: {
    textDecoration: 'none',
    color: 'inherit',
    background: 'var(--color-surface)',
  },
  checkbox: {
    width: 24,
    height: 24,
    minWidth: 24,
    borderRadius: 6,
    border: '1.5px solid',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    fontWeight: 800,
    transition: 'all 0.15s',
  },
  bucket: {
    marginBottom: 18,
  },
  bucketHeader: {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
    color: 'var(--color-text-secondary)',
    marginBottom: 10,
    marginTop: 4,
  },
  modeHint: {
    fontSize: 12,
    color: 'var(--color-text-secondary)',
    marginBottom: 14,
  },
} satisfies Record<string, CSSProperties>;
