import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '@/components/common/Avatar';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { LuxSelect } from '@/components/common/LuxSelect';
import { searchUsers, type UserSearchResult } from '@/api/users.api';
import { uploadFile, getDownloadUrl } from '@/api/files.api';
import { getSocket } from '@/socket/socket';
import {
  addChecklistItem,
  addComment,
  deleteTask,
  detachFile,
  getAttachments,
  getChecklist,
  getComments,
  getTask,
  removeChecklistItem,
  TaskPriority,
  TaskStatus,
  updateChecklistItem,
  updateTask,
  type ChecklistItem,
  type Task,
  type TaskAttachment,
  type TaskComment,
  type UserRef,
} from '@/api/tasks.api';

const STATUS_OPTIONS = [
  { value: TaskStatus.NEW, label: 'Новая' },
  { value: TaskStatus.IN_PROGRESS, label: 'В работе' },
  { value: TaskStatus.IN_REVIEW, label: 'На проверке' },
  { value: TaskStatus.DONE, label: 'Готово' },
  { value: TaskStatus.CANCELLED, label: 'Отменена' },
];

const PRIORITY_OPTIONS = [
  { value: TaskPriority.LOW, label: 'Низкий' },
  { value: TaskPriority.MEDIUM, label: 'Средний' },
  { value: TaskPriority.HIGH, label: 'Высокий' },
  { value: TaskPriority.URGENT, label: 'Срочный' },
];

function userLabel(u: UserRef | UserSearchResult) {
  return [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function toDateInputValue(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [titleDraft, setTitleDraft] = useState('');
  const [descDraft, setDescDraft] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);
  const [savingDesc, setSavingDesc] = useState(false);

  const [commentDraft, setCommentDraft] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [checklistDraft, setChecklistDraft] = useState('');
  const [addingChecklist, setAddingChecklist] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [actionError, setActionError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const orgIdForSearch = task?.organizationId;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    Promise.all([getTask(id), getComments(id), getChecklist(id), getAttachments(id)])
      .then(([t, c, cl, att]) => {
        if (cancelled) return;
        setTask(t);
        setComments(c);
        setChecklist(cl);
        setAttachments(att);
        setTitleDraft(t.title);
        setDescDraft(t.description ?? '');
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError('Не удалось загрузить задачу');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!id || !task) return;
    const socket = getSocket();
    if (!socket.connected) socket.connect();
    socket.emit('org:join', { orgId: task.organizationId });

    const onUpdated = (incoming: Task) => {
      if (incoming.id !== id) return;
      setTask(incoming);
      getComments(id).then(setComments).catch(() => {});
      getChecklist(id).then(setChecklist).catch(() => {});
      getAttachments(id).then(setAttachments).catch(() => {});
    };
    const onDeleted = (payload: { id: string }) => {
      if (payload.id === id) navigate('/tasks');
    };

    socket.on('task:updated', onUpdated);
    socket.on('task:deleted', onDeleted);

    return () => {
      socket.off('task:updated', onUpdated);
      socket.off('task:deleted', onDeleted);
    };
  }, [id, task, navigate]);

  const applyPatch = async <K extends keyof Task>(patch: Partial<Task>, rollback: () => void) => {
    if (!task) return;
    const prev = task;
    setTask({ ...prev, ...patch } as Task);
    setActionError('');
    try {
      const updated = await updateTask(prev.id, patch as any);
      setTask(updated);
    } catch (e: any) {
      rollback();
      setActionError(e.response?.data?.error?.message || 'Не удалось сохранить изменение');
    }
  };

  const onChangeStatus = (next: TaskStatus) => {
    if (!task || task.status === next) return;
    const prev = task.status;
    void applyPatch({ status: next }, () => setTask((t) => (t ? { ...t, status: prev } : t)));
  };

  const onChangePriority = (next: TaskPriority) => {
    if (!task || task.priority === next) return;
    const prev = task.priority;
    void applyPatch({ priority: next }, () => setTask((t) => (t ? { ...t, priority: prev } : t)));
  };

  const onChangeDueDate = (next: string) => {
    if (!task) return;
    const prev = task.dueDate;
    const value = next ? new Date(next).toISOString() : undefined;
    void applyPatch({ dueDate: value }, () =>
      setTask((t) => (t ? { ...t, dueDate: prev } : t)),
    );
  };

  const handleSaveTitle = async () => {
    if (!task || titleDraft.trim().length === 0 || titleDraft === task.title) return;
    setSavingTitle(true);
    setActionError('');
    try {
      const updated = await updateTask(task.id, { title: titleDraft.trim() });
      setTask(updated);
    } catch (e: any) {
      setActionError(e.response?.data?.error?.message || 'Не удалось сохранить заголовок');
    } finally {
      setSavingTitle(false);
    }
  };

  const handleSaveDescription = async () => {
    if (!task || descDraft === (task.description ?? '')) return;
    setSavingDesc(true);
    setActionError('');
    try {
      const updated = await updateTask(task.id, { description: descDraft });
      setTask(updated);
    } catch (e: any) {
      setActionError(e.response?.data?.error?.message || 'Не удалось сохранить описание');
    } finally {
      setSavingDesc(false);
    }
  };

  const handleAddComment = async () => {
    if (!task || !commentDraft.trim()) return;
    setSendingComment(true);
    setActionError('');
    try {
      const created = await addComment(task.id, commentDraft.trim());
      setComments((prev) => [...prev, created]);
      setCommentDraft('');
    } catch (e: any) {
      setActionError(e.response?.data?.error?.message || 'Не удалось отправить комментарий');
    } finally {
      setSendingComment(false);
    }
  };

  const handleAddChecklistItem = async () => {
    if (!task || !checklistDraft.trim()) return;
    setAddingChecklist(true);
    setActionError('');
    try {
      const item = await addChecklistItem(task.id, checklistDraft.trim());
      setChecklist((prev) => [...prev, item]);
      setChecklistDraft('');
    } catch (e: any) {
      setActionError(e.response?.data?.error?.message || 'Не удалось добавить пункт');
    } finally {
      setAddingChecklist(false);
    }
  };

  const handleToggleChecklistItem = async (item: ChecklistItem) => {
    const next = !item.isDone;
    setChecklist((prev) => prev.map((i) => (i.id === item.id ? { ...i, isDone: next } : i)));
    try {
      await updateChecklistItem(item.id, { isDone: next });
    } catch {
      setChecklist((prev) => prev.map((i) => (i.id === item.id ? { ...i, isDone: item.isDone } : i)));
      setActionError('Не удалось обновить пункт чек-листа');
    }
  };

  const handleRemoveChecklistItem = async (itemId: string) => {
    const prev = checklist;
    setChecklist((p) => p.filter((i) => i.id !== itemId));
    try {
      await removeChecklistItem(itemId);
    } catch {
      setChecklist(prev);
      setActionError('Не удалось удалить пункт');
    }
  };

  const handleAttachUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!task) return;
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingAttachment(true);
    setActionError('');
    try {
      const uploaded = await uploadFile(file, task.organizationId, undefined, undefined, task.id);
      const fresh = await getAttachments(task.id);
      setAttachments(fresh);
      void uploaded;
    } catch (e: any) {
      setActionError(e.message || 'Не удалось прикрепить файл');
    } finally {
      setUploadingAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownloadAttachment = async (fileId: string) => {
    try {
      const { url } = await getDownloadUrl(fileId);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      setActionError('Не удалось скачать файл');
    }
  };

  const handleDetachAttachment = async (fileId: string) => {
    if (!task) return;
    if (!window.confirm('Открепить файл от задачи?')) return;
    const prev = attachments;
    setAttachments((p) => p.filter((a) => a.id !== fileId));
    try {
      await detachFile(task.id, fileId);
    } catch {
      setAttachments(prev);
      setActionError('Не удалось открепить файл');
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    if (!window.confirm('Удалить задачу безвозвратно?')) return;
    setDeleting(true);
    try {
      await deleteTask(task.id);
      navigate('/tasks');
    } catch (e: any) {
      setActionError(e.response?.data?.error?.message || 'Не удалось удалить задачу');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-shell">
        <div className="page-shell__inner" style={styles.centered}>
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (loadError || !task) {
    return (
      <div className="page-shell">
        <div className="page-shell__inner">
          <div className="lux-alert">{loadError || 'Задача не найдена'}</div>
          <Link to="/tasks" className="lux-button-secondary" style={{ marginTop: 12, display: 'inline-block' }}>
            Назад к списку
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="page-shell__inner">
        <div style={styles.breadcrumbs}>
          <Link to="/tasks" className="lux-pill">
            ← К списку задач
          </Link>
        </div>

        <section className="lux-panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="field-group">
            <label className="field-group__label">Заголовок</label>
            <div style={styles.inlineSave}>
              <input
                className="lux-input"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                maxLength={200}
                style={{ flex: 1 }}
              />
              <button
                className="lux-button"
                onClick={handleSaveTitle}
                disabled={savingTitle || titleDraft === task.title || titleDraft.trim().length === 0}
              >
                {savingTitle ? 'Сохраняем...' : 'Сохранить'}
              </button>
            </div>
          </div>

          <div style={styles.metaGrid}>
            <div className="field-group">
              <label className="field-group__label">Статус</label>
              <LuxSelect value={task.status} options={STATUS_OPTIONS} onChange={(v) => onChangeStatus(v as TaskStatus)} />
            </div>
            <div className="field-group">
              <label className="field-group__label">Приоритет</label>
              <LuxSelect value={task.priority} options={PRIORITY_OPTIONS} onChange={(v) => onChangePriority(v as TaskPriority)} />
            </div>
            <div className="field-group">
              <label className="field-group__label">Срок</label>
              <input
                className="lux-input"
                type="date"
                value={toDateInputValue(task.dueDate)}
                onChange={(e) => onChangeDueDate(e.target.value)}
              />
            </div>
          </div>

          <AssigneePicker
            assignee={task.assignedToUser ?? null}
            orgId={orgIdForSearch}
            onChange={(next) => {
              const prev = task.assignedToUser ?? null;
              const nextId = next?.id ?? null;
              setTask({ ...task, assignedToUser: next, assignedTo: nextId } as Task);
              setActionError('');
              updateTask(task.id, { assignedTo: nextId })
                .then((updated) => setTask(updated))
                .catch((e) => {
                  setTask({ ...task, assignedToUser: prev } as Task);
                  setActionError(e.response?.data?.error?.message || 'Не удалось обновить исполнителя');
                });
            }}
          />

          <WatchersEditor
            watchers={task.watchers ?? []}
            orgId={orgIdForSearch}
            onChange={(next) => {
              const prev = task.watchers ?? [];
              setTask({ ...task, watchers: next } as Task);
              setActionError('');
              updateTask(task.id, { watcherIds: next.map((w) => w.id) })
                .then((updated) => setTask(updated))
                .catch((e) => {
                  setTask({ ...task, watchers: prev } as Task);
                  setActionError(e.response?.data?.error?.message || 'Не удалось обновить наблюдателей');
                });
            }}
          />

          <div className="field-group">
            <label className="field-group__label">Описание</label>
            <textarea
              className="lux-textarea"
              value={descDraft}
              onChange={(e) => setDescDraft(e.target.value)}
              rows={6}
              maxLength={4000}
              placeholder="Добавьте контекст и ожидаемый результат"
            />
            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="lux-button"
                onClick={handleSaveDescription}
                disabled={savingDesc || descDraft === (task.description ?? '')}
              >
                {savingDesc ? 'Сохраняем...' : 'Сохранить описание'}
              </button>
            </div>
          </div>

          {actionError && <div className="lux-alert">{actionError}</div>}

          <div style={styles.taskFooterMeta}>
            {task.createdByUser && <span>Создал: {userLabel(task.createdByUser)}</span>}
            <span>Создано: {formatDateTime(task.createdAt)}</span>
            {task.completedAt && <span>Завершено: {formatDateTime(task.completedAt)}</span>}
          </div>
        </section>

        <section className="lux-panel" style={{ padding: 20, marginTop: 14 }}>
          <h2 style={styles.sectionTitle}>Чек-лист {checklist.length > 0 && `(${checklist.filter((i) => i.isDone).length}/${checklist.length})`}</h2>
          {checklist.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {checklist.map((item) => (
                <div key={item.id} style={styles.checklistRow}>
                  <button
                    type="button"
                    onClick={() => handleToggleChecklistItem(item)}
                    style={{
                      ...styles.checklistCheckbox,
                      background: item.isDone ? '#24744f' : 'transparent',
                      color: item.isDone ? '#fff' : 'transparent',
                      borderColor: item.isDone ? '#24744f' : 'rgba(124, 132, 147, 0.4)',
                    }}
                    aria-label={item.isDone ? 'Снять отметку' : 'Отметить выполненным'}
                  >
                    ✓
                  </button>
                  <span style={{
                    flex: 1,
                    textDecoration: item.isDone ? 'line-through' : 'none',
                    color: item.isDone ? 'var(--color-text-secondary)' : 'inherit',
                  }}>
                    {item.title}
                  </span>
                  <button
                    type="button"
                    className="lux-pill"
                    onClick={() => handleRemoveChecklistItem(item.id)}
                  >
                    Удалить
                  </button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="lux-input"
              value={checklistDraft}
              onChange={(e) => setChecklistDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !addingChecklist) {
                  e.preventDefault();
                  handleAddChecklistItem();
                }
              }}
              placeholder="Новый пункт чек-листа"
              maxLength={500}
              style={{ flex: 1 }}
            />
            <button
              className="lux-button"
              onClick={handleAddChecklistItem}
              disabled={addingChecklist || !checklistDraft.trim()}
            >
              {addingChecklist ? 'Добавляем...' : 'Добавить'}
            </button>
          </div>
        </section>

        <section className="lux-panel" style={{ padding: 20, marginTop: 14 }}>
          <h2 style={styles.sectionTitle}>Вложения {attachments.length > 0 && `(${attachments.length})`}</h2>
          {attachments.length > 0 ? (
            <div className="collection-list" style={{ marginBottom: 14 }}>
              {attachments.map((att) => (
                <article key={att.id} className="list-card" style={{ background: 'var(--color-surface)' }}>
                  <div className="list-card__body">
                    <div className="list-card__title">{att.originalName}</div>
                    <div className="list-card__subtitle">
                      {(att.sizeBytes / 1024).toFixed(1)} KB · {att.mimeType}
                    </div>
                  </div>
                  <button className="lux-pill" onClick={() => handleDownloadAttachment(att.id)}>
                    Скачать
                  </button>
                  <button className="lux-pill" onClick={() => handleDetachAttachment(att.id)}>
                    Открепить
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="list-card__subtitle" style={{ padding: 8, marginBottom: 10 }}>
              Пока файлов нет.
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleAttachUpload}
            style={{ display: 'none' }}
          />
          <button
            className="lux-button"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAttachment}
          >
            {uploadingAttachment ? 'Загружаем...' : 'Прикрепить файл'}
          </button>
        </section>

        <section className="lux-panel" style={{ padding: 20, marginTop: 14 }}>
          <h2 style={styles.sectionTitle}>Комментарии</h2>
          {comments.length === 0 ? (
            <div className="list-card__subtitle" style={{ padding: 8 }}>Пока нет комментариев.</div>
          ) : (
            <div className="collection-list" style={{ marginBottom: 14 }}>
              {comments.map((c) => (
                <article key={c.id} className="list-card">
                  <Avatar
                    name={c.user ? userLabel(c.user) : 'Пользователь'}
                    src={c.user?.avatarUrl}
                    size="sm"
                  />
                  <div className="list-card__body">
                    <div className="list-card__title">
                      {c.user ? userLabel(c.user) : 'Пользователь'}
                    </div>
                    <div className="list-card__subtitle" style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>
                      {c.content}
                    </div>
                    <div className="list-card__meta" style={{ marginTop: 6 }}>
                      <span>{formatDateTime(c.createdAt)}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          <textarea
            className="lux-textarea"
            value={commentDraft}
            onChange={(e) => setCommentDraft(e.target.value)}
            rows={3}
            placeholder="Добавить комментарий"
          />
          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="lux-button"
              onClick={handleAddComment}
              disabled={sendingComment || !commentDraft.trim()}
            >
              {sendingComment ? 'Отправляем...' : 'Отправить'}
            </button>
          </div>
        </section>

        <section className="lux-panel" style={{ padding: 20, marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="lux-button-secondary" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Удаляем...' : 'Удалить задачу'}
          </button>
        </section>
      </div>
    </div>
  );
}

interface AssigneePickerProps {
  assignee: UserRef | null;
  orgId?: string;
  onChange: (next: UserRef | null) => void;
}

function AssigneePicker({ assignee, orgId, onChange }: AssigneePickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [editing, setEditing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!editing || !query.trim() || !orgId) {
      setResults([]);
      return;
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const found = await searchUsers(query, orgId);
        setResults(found);
      } catch {
        setResults([]);
      }
    }, 220);
    return () => clearTimeout(timer.current);
  }, [editing, query, orgId]);

  return (
    <div className="field-group">
      <label className="field-group__label">Исполнитель</label>
      {assignee && !editing ? (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Avatar name={userLabel(assignee)} src={assignee.avatarUrl} size="sm" />
          <span>{userLabel(assignee)}</span>
          <button className="lux-pill" onClick={() => setEditing(true)}>
            Изменить
          </button>
          <button className="lux-pill" onClick={() => onChange(null)}>
            Снять
          </button>
        </div>
      ) : (
        <>
          <input
            className="lux-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Найти участника организации"
            autoFocus={editing}
          />
          {query && results.length > 0 && (
            <div className="lux-panel" style={{ padding: 6, marginTop: 6, background: 'var(--color-surface)' }}>
              <div className="collection-list">
                {results.map((u) => (
                  <button
                    key={u.id}
                    className="list-card"
                    onClick={() => {
                      onChange({ id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName, avatarUrl: u.avatarUrl });
                      setQuery('');
                      setResults([]);
                      setEditing(false);
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
          {editing && (
            <div style={{ marginTop: 6 }}>
              <button className="lux-pill" onClick={() => { setEditing(false); setQuery(''); setResults([]); }}>
                Отмена
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface WatchersEditorProps {
  watchers: UserRef[];
  orgId?: string;
  onChange: (next: UserRef[]) => void;
}

function WatchersEditor({ watchers, orgId, onChange }: WatchersEditorProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!query.trim() || !orgId) {
      setResults([]);
      return;
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const found = await searchUsers(query, orgId);
        setResults(found);
      } catch {
        setResults([]);
      }
    }, 220);
    return () => clearTimeout(timer.current);
  }, [query, orgId]);

  const visibleResults = useMemo(() => {
    const ids = new Set(watchers.map((u) => u.id));
    return results.filter((u) => !ids.has(u.id));
  }, [results, watchers]);

  return (
    <div className="field-group">
      <label className="field-group__label">Наблюдатели</label>
      {watchers.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
          {watchers.map((u) => (
            <button
              key={u.id}
              className="lux-chip is-active"
              onClick={() => onChange(watchers.filter((w) => w.id !== u.id))}
            >
              {userLabel(u)} ×
            </button>
          ))}
        </div>
      )}
      <input
        className="lux-input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Добавить наблюдателей"
      />
      {query && visibleResults.length > 0 && (
        <div className="lux-panel" style={{ padding: 6, marginTop: 6 }}>
          <div className="collection-list">
            {visibleResults.map((u) => (
              <button
                key={u.id}
                className="list-card"
                onClick={() => {
                  onChange([
                    ...watchers,
                    { id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName, avatarUrl: u.avatarUrl },
                  ]);
                  setQuery('');
                  setResults([]);
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
  );
}

const styles = {
  centered: {
    display: 'flex',
    justifyContent: 'center',
    padding: 32,
  },
  breadcrumbs: {
    marginBottom: 14,
  },
  inlineSave: {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
  },
  metaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    margin: '0 0 14px',
  },
  taskFooterMeta: {
    display: 'flex',
    gap: 16,
    flexWrap: 'wrap',
    fontSize: 12,
    color: 'var(--color-text-secondary)',
    paddingTop: 8,
    borderTop: '1px solid var(--color-border)',
  },
  checklistRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '8px 4px',
  },
  checklistCheckbox: {
    width: 22,
    height: 22,
    minWidth: 22,
    borderRadius: 6,
    border: '1.5px solid',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 800,
    transition: 'all 0.15s',
  },
} satisfies Record<string, CSSProperties>;
