import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Modal } from '@/components/common/Modal';
import { Avatar } from '@/components/common/Avatar';
import { LuxSelect } from '@/components/common/LuxSelect';
import { useOrganizationStore } from '@/stores/organization.store';
import { searchUsers, type UserSearchResult } from '@/api/users.api';
import { createTask, TaskPriority, type Task } from '@/api/tasks.api';

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (task: Task) => void;
}

const PRIORITY_OPTIONS = [
  { value: TaskPriority.LOW, label: 'Низкий' },
  { value: TaskPriority.MEDIUM, label: 'Средний' },
  { value: TaskPriority.HIGH, label: 'Высокий' },
  { value: TaskPriority.URGENT, label: 'Срочный' },
];

function userLabel(user: UserSearchResult) {
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
}

export function CreateTaskModal({ open, onClose, onCreated }: CreateTaskModalProps) {
  const currentOrg = useOrganizationStore((state) => state.currentOrg);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [dueDate, setDueDate] = useState('');

  const [assignee, setAssignee] = useState<UserSearchResult | null>(null);
  const [assigneeQuery, setAssigneeQuery] = useState('');
  const [assigneeResults, setAssigneeResults] = useState<UserSearchResult[]>([]);

  const [watchers, setWatchers] = useState<UserSearchResult[]>([]);
  const [watcherQuery, setWatcherQuery] = useState('');
  const [watcherResults, setWatcherResults] = useState<UserSearchResult[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const assigneeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const watcherTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!open) {
      setTitle('');
      setDescription('');
      setPriority(TaskPriority.MEDIUM);
      setDueDate('');
      setAssignee(null);
      setAssigneeQuery('');
      setAssigneeResults([]);
      setWatchers([]);
      setWatcherQuery('');
      setWatcherResults([]);
      setSubmitting(false);
      setError('');
    }
  }, [open]);

  useEffect(() => {
    if (!assigneeQuery.trim() || !currentOrg) {
      setAssigneeResults([]);
      return;
    }
    clearTimeout(assigneeTimer.current);
    assigneeTimer.current = setTimeout(async () => {
      try {
        const found = await searchUsers(assigneeQuery, currentOrg.id);
        setAssigneeResults(found);
      } catch {
        setAssigneeResults([]);
      }
    }, 220);
    return () => clearTimeout(assigneeTimer.current);
  }, [assigneeQuery, currentOrg]);

  useEffect(() => {
    if (!watcherQuery.trim() || !currentOrg) {
      setWatcherResults([]);
      return;
    }
    clearTimeout(watcherTimer.current);
    watcherTimer.current = setTimeout(async () => {
      try {
        const found = await searchUsers(watcherQuery, currentOrg.id);
        setWatcherResults(found);
      } catch {
        setWatcherResults([]);
      }
    }, 220);
    return () => clearTimeout(watcherTimer.current);
  }, [watcherQuery, currentOrg]);

  const visibleWatcherResults = useMemo(() => {
    const ids = new Set(watchers.map((u) => u.id));
    return watcherResults.filter((u) => !ids.has(u.id));
  }, [watcherResults, watchers]);

  const visibleAssigneeResults = useMemo(() => {
    if (!assignee) return assigneeResults;
    return assigneeResults.filter((u) => u.id !== assignee.id);
  }, [assigneeResults, assignee]);

  const canSubmit = title.trim().length > 0 && !!currentOrg && !submitting;

  const handleSubmit = async () => {
    if (!currentOrg || !canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      const task = await createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        organizationId: currentOrg.id,
        assignedTo: assignee?.id,
        dueDate: dueDate || undefined,
        watcherIds: watchers.length > 0 ? watchers.map((w) => w.id) : undefined,
      });
      onCreated(task);
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.error?.message || 'Не удалось создать задачу');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Новая задача">
      <div className="inline-form create-task-modal">
        <style>{`
          .create-task-modal .lux-input,
          .create-task-modal .lux-textarea {
            background: var(--color-surface);
          }
          .create-task-modal .lux-input:focus,
          .create-task-modal .lux-textarea:focus {
            background: var(--color-surface);
          }
          .create-task-modal .lux-dropdown__trigger {
            background: var(--color-surface);
          }
          .create-task-modal .lux-dropdown__menu {
            background: var(--color-surface);
          }
          .create-task-modal .list-card {
            background: var(--color-surface);
          }
          .create-task-modal .list-card:hover {
            background: var(--color-surface-soft);
          }
        `}</style>
        <div className="field-group">
          <label className="field-group__label">Заголовок</label>
          <input
            className="lux-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Например, подготовить отчёт по продажам"
            autoFocus
            maxLength={200}
          />
        </div>

        <div className="field-group">
          <label className="field-group__label">Описание</label>
          <textarea
            className="lux-textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Подробности, контекст и ожидаемый результат"
            rows={4}
            maxLength={4000}
          />
        </div>

        <div style={styles.row}>
          <div className="field-group" style={{ flex: 1 }}>
            <label className="field-group__label">Приоритет</label>
            <LuxSelect value={priority} options={PRIORITY_OPTIONS} onChange={(v) => setPriority(v as TaskPriority)} />
          </div>
          <div className="field-group" style={{ flex: 1 }}>
            <label className="field-group__label">Срок</label>
            <input
              className="lux-input"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <div className="field-group">
          <label className="field-group__label">Исполнитель</label>
          {assignee ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              <button
                className="lux-chip is-active"
                onClick={() => {
                  setAssignee(null);
                  setAssigneeQuery('');
                }}
              >
                {userLabel(assignee)} ×
              </button>
            </div>
          ) : (
            <input
              className="lux-input"
              value={assigneeQuery}
              onChange={(e) => setAssigneeQuery(e.target.value)}
              placeholder="Найти участника организации"
            />
          )}
          {!assignee && assigneeQuery && visibleAssigneeResults.length > 0 && (
            <div className="lux-panel" style={{ padding: 6, marginTop: 6, background: 'var(--color-surface)' }}>
              <div className="collection-list">
                {visibleAssigneeResults.map((u) => (
                  <button
                    key={u.id}
                    className="list-card"
                    onClick={() => {
                      setAssignee(u);
                      setAssigneeQuery('');
                      setAssigneeResults([]);
                    }}
                  >
                    <Avatar name={userLabel(u)} src={u.avatarUrl} size="sm" />
                    <div className="list-card__body">
                      <div className="list-card__title">{userLabel(u)}</div>
                      <div className="list-card__subtitle">{u.email}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="field-group">
          <label className="field-group__label">Наблюдатели</label>
          {watchers.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              {watchers.map((u) => (
                <button
                  key={u.id}
                  className="lux-chip is-active"
                  onClick={() => setWatchers((prev) => prev.filter((w) => w.id !== u.id))}
                >
                  {userLabel(u)} ×
                </button>
              ))}
            </div>
          )}
          <input
            className="lux-input"
            value={watcherQuery}
            onChange={(e) => setWatcherQuery(e.target.value)}
            placeholder="Добавить наблюдателей"
          />
          {watcherQuery && visibleWatcherResults.length > 0 && (
            <div className="lux-panel" style={{ padding: 6, marginTop: 6, background: 'var(--color-surface)' }}>
              <div className="collection-list">
                {visibleWatcherResults.map((u) => (
                  <button
                    key={u.id}
                    className="list-card"
                    onClick={() => {
                      setWatchers((prev) => [...prev, u]);
                      setWatcherQuery('');
                      setWatcherResults([]);
                    }}
                  >
                    <Avatar name={userLabel(u)} src={u.avatarUrl} size="sm" />
                    <div className="list-card__body">
                      <div className="list-card__title">{userLabel(u)}</div>
                      <div className="list-card__subtitle">{u.email}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && <div className="lux-alert">{error}</div>}

        <div className="form-actions">
          <button className="lux-button-secondary" onClick={onClose} disabled={submitting}>
            Отмена
          </button>
          <button className="lux-button" onClick={handleSubmit} disabled={!canSubmit}>
            {submitting ? 'Создаём...' : 'Создать задачу'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

const styles = {
  row: {
    display: 'flex',
    gap: 12,
  },
} satisfies Record<string, CSSProperties>;
