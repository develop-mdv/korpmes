import { useEffect, useState } from 'react';
import clsx from 'clsx';
import * as tasksApi from '@/api/tasks.api';
import { EmptyState } from '@/components/common/EmptyState';
import { useOrganizationStore } from '@/stores/organization.store';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignedTo?: { firstName: string; lastName: string };
  dueDate?: string;
  createdAt: string;
}

const statuses = ['ALL', 'NEW', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'] as const;

export function TasksPage() {
  const { currentOrg } = useOrganizationStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [statusFilter, setStatusFilter] = useState<(typeof statuses)[number]>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentOrg) return;

    setLoading(true);
    const filters = statusFilter !== 'ALL' ? { status: statusFilter } : {};
    tasksApi.getTasks(currentOrg.id, filters).then((response) => {
      setTasks(response as unknown as Task[]);
      setLoading(false);
    });
  }, [currentOrg, statusFilter]);

  return (
    <div className="page-shell">
      <div className="page-shell__inner">
        <section className="lux-panel page-hero">
          <div className="page-hero__copy">
            <div className="page-hero__kicker">Задачи</div>
            <h1 className="page-hero__title">Рабочий поток в светлом премиальном контуре.</h1>
            <p className="page-hero__description">
              Просматривайте приоритеты, статусы и сроки в аккуратной исполнительной панели.
            </p>
            <div className="page-hero__meta">
              <span className="lux-pill">{tasks.length} задач</span>
              <span className="lux-pill">{statusFilter === 'ALL' ? 'все статусы' : statusFilter.toLowerCase()}</span>
            </div>
          </div>
          <div className="page-hero__actions">
            <button className="lux-button">Новая задача</button>
          </div>
        </section>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {statuses.map((status) => (
            <button
              key={status}
              className={clsx('lux-chip', statusFilter === status && 'is-active')}
              onClick={() => setStatusFilter(status)}
            >
              {status === 'ALL'
                ? 'Все'
                : status === 'NEW'
                  ? 'Новые'
                  : status === 'IN_PROGRESS'
                    ? 'В работе'
                    : status === 'IN_REVIEW'
                      ? 'На проверке'
                      : 'Готово'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="lux-panel"><div style={{ padding: 28 }}>Загружаем задачи...</div></div>
        ) : tasks.length === 0 ? (
          <section className="lux-panel" style={{ minHeight: 340 }}>
            <EmptyState title="Пока задач нет" description="Когда появятся новые поручения или дедлайны, они будут показаны здесь." />
          </section>
        ) : (
          <section className="page-grid page-grid--two stagger-in">
            {tasks.map((task) => (
              <article key={task.id} className="lux-panel stat-card">
                <div className="list-card__meta">
                  <span className="lux-pill">{task.status.replace('_', ' ')}</span>
                  <span className="lux-pill">{task.priority}</span>
                </div>
                <h3 className="list-card__title" style={{ marginTop: 16, fontSize: 20 }}>
                  {task.title}
                </h3>
                <div className="list-card__meta" style={{ marginTop: 14 }}>
                  <span>{task.assignedTo ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}` : 'Не назначено'}</span>
                  <span>{task.dueDate ? `Срок: ${new Date(task.dueDate).toLocaleDateString('ru-RU')}` : 'Без срока'}</span>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
