import { useEffect, useMemo, useState } from 'react';
import * as departmentsApi from '@/api/departments.api';
import { EmptyState } from '@/components/common/EmptyState';
import { useOrganizationStore } from '@/stores/organization.store';

type DepartmentWithDepth = departmentsApi.Department & {
  depth: number;
  parentName?: string;
};

function flattenDepartments(
  departments: departmentsApi.Department[],
  parentName?: string,
  depth = 0,
): DepartmentWithDepth[] {
  return departments.flatMap((department) => [
    {
      ...department,
      depth,
      parentName,
    },
    ...flattenDepartments(department.children ?? [], department.name, depth + 1),
  ]);
}

export function DepartmentsPage() {
  const currentOrg = useOrganizationStore((state) => state.currentOrg);

  const [departments, setDepartments] = useState<departmentsApi.Department[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentDepartmentId, setParentDepartmentId] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const flatDepartments = useMemo(() => flattenDepartments(departments), [departments]);

  const loadDepartments = async () => {
    if (!currentOrg) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await departmentsApi.listDepartments(currentOrg.id);
      setDepartments(response);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить отделы.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, [currentOrg]);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setParentDepartmentId('');
  };

  const handleSubmit = async () => {
    if (!currentOrg || !name.trim()) {
      return;
    }

    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        parentDepartmentId: parentDepartmentId || undefined,
      };

      if (editingId) {
        await departmentsApi.updateDepartment(currentOrg.id, editingId, payload);
        setMessage('Отдел обновлён.');
      } else {
        await departmentsApi.createDepartment(currentOrg.id, payload);
        setMessage('Отдел создан.');
      }

      resetForm();
      await loadDepartments();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Не удалось сохранить отдел.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (department: DepartmentWithDepth) => {
    setEditingId(department.id);
    setName(department.name);
    setDescription(department.description ?? '');
    setParentDepartmentId(department.parentDepartmentId ?? '');
    setMessage(null);
    setError(null);
  };

  const handleDelete = async (departmentId: string) => {
    if (!currentOrg || !window.confirm('Удалить отдел?')) {
      return;
    }

    setMessage(null);
    setError(null);

    try {
      await departmentsApi.deleteDepartment(currentOrg.id, departmentId);
      if (editingId === departmentId) {
        resetForm();
      }
      setMessage('Отдел удалён.');
      await loadDepartments();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Не удалось удалить отдел.');
    }
  };

  if (!currentOrg) {
    return (
      <div className="page-shell">
        <div className="page-shell__inner">
          <section className="lux-panel" style={{ minHeight: 340 }}>
            <EmptyState title="Нет активной организации" description="Сначала выберите рабочее пространство, чтобы управлять его структурой." />
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
            <div className="page-hero__kicker">Отделы</div>
            <h1 className="page-hero__title">Структура организации без визуального шума.</h1>
            <p className="page-hero__description">
              Настройте направления, команды и вложенность отделов так, чтобы управленческая карта пространства читалась
              мгновенно.
            </p>
            <div className="page-hero__meta">
              <span className="lux-pill">{flatDepartments.length} отделов</span>
              <span className="lux-pill">{currentOrg.name}</span>
            </div>
          </div>
        </section>

        <div className="page-grid page-grid--two">
          <section className="lux-panel stat-card">
            <div className="auth-shell__form-copy" style={{ marginBottom: 20 }}>
              <div className="auth-shell__form-title">{editingId ? 'Редактирование' : 'Новый отдел'}</div>
              <div className="auth-shell__form-subtitle">
                {editingId ? 'Обновите название, описание и родительский отдел.' : 'Добавьте новый блок в структуру организации.'}
              </div>
            </div>

            <div className="inline-form">
              <div className="field-group">
                <label className="field-group__label" htmlFor="department-name">
                  Название
                </label>
                <input
                  id="department-name"
                  className="lux-input"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Стратегия и развитие"
                />
              </div>

              <div className="field-group">
                <label className="field-group__label" htmlFor="department-parent">
                  Родительский отдел
                </label>
                <select
                  id="department-parent"
                  className="lux-select"
                  value={parentDepartmentId}
                  onChange={(event) => setParentDepartmentId(event.target.value)}
                >
                  <option value="">Без родителя</option>
                  {flatDepartments
                    .filter((department) => department.id !== editingId)
                    .map((department) => (
                      <option key={department.id} value={department.id}>
                        {'· '.repeat(department.depth)}
                        {department.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="field-group">
                <label className="field-group__label" htmlFor="department-description">
                  Описание
                </label>
                <textarea
                  id="department-description"
                  className="lux-input"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={6}
                  placeholder="Коротко обозначьте зону ответственности отдела."
                  style={{ resize: 'vertical' }}
                />
              </div>

              {message && (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 18,
                    background: 'rgba(30, 157, 104, 0.1)',
                    border: '1px solid rgba(30, 157, 104, 0.18)',
                    color: 'var(--color-success)',
                    fontSize: 14,
                  }}
                >
                  {message}
                </div>
              )}

              {error && (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 18,
                    background: 'rgba(212, 98, 98, 0.1)',
                    border: '1px solid rgba(212, 98, 98, 0.18)',
                    color: 'var(--color-error)',
                    fontSize: 14,
                  }}
                >
                  {error}
                </div>
              )}

              <div className="form-actions">
                {editingId && (
                  <button className="lux-button-ghost" type="button" onClick={resetForm}>
                    Отменить редактирование
                  </button>
                )}
                <button className="lux-button" type="button" onClick={handleSubmit} disabled={saving || !name.trim()}>
                  {saving ? 'Сохраняем...' : editingId ? 'Сохранить отдел' : 'Создать отдел'}
                </button>
              </div>
            </div>
          </section>

          <section className="lux-panel stat-card">
            <div className="auth-shell__form-copy" style={{ marginBottom: 20 }}>
              <div className="auth-shell__form-title">Текущая структура</div>
              <div className="auth-shell__form-subtitle">Все отделы и их положение в иерархии</div>
            </div>

            {loading ? (
              <div style={{ padding: '6px 0', color: 'var(--color-text-secondary)' }}>Загружаем структуру...</div>
            ) : flatDepartments.length === 0 ? (
              <EmptyState title="Пока нет отделов" description="Создайте первый отдел, чтобы начать собирать структуру организации." />
            ) : (
              <div className="collection-list">
                {flatDepartments.map((department) => (
                  <article
                    key={department.id}
                    className="list-card"
                    style={{ marginLeft: department.depth > 0 ? Math.min(department.depth * 14, 42) : 0 }}
                  >
                    <div className="list-card__body">
                      <div className="list-card__title">{department.name}</div>
                      <div className="list-card__subtitle" style={{ marginTop: 6 }}>
                        {department.description || 'Описание ещё не добавлено.'}
                      </div>
                      <div className="list-card__meta">
                        <span>{department.parentName ? `Внутри: ${department.parentName}` : 'Корневой отдел'}</span>
                        <span>{department.children?.length ? `${department.children.length} подотделов` : 'Без вложенных отделов'}</span>
                      </div>
                    </div>
                    <div className="list-card__actions">
                      <button className="lux-button-secondary" type="button" onClick={() => handleEdit(department)}>
                        Изменить
                      </button>
                      <button className="lux-button-danger" type="button" onClick={() => handleDelete(department.id)}>
                        Удалить
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
