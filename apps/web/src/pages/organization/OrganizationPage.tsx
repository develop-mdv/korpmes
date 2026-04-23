import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as orgsApi from '@/api/organizations.api';
import { EmptyState } from '@/components/common/EmptyState';
import { useOrganizationStore } from '@/stores/organization.store';

export function OrganizationPage() {
  const currentOrg = useOrganizationStore((state) => state.currentOrg);
  const organizations = useOrganizationStore((state) => state.organizations);
  const setCurrentOrg = useOrganizationStore((state) => state.setCurrentOrg);
  const setOrganizations = useOrganizationStore((state) => state.setOrganizations);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(currentOrg?.name ?? '');
    setDescription(currentOrg?.description ?? '');
  }, [currentOrg]);

  if (!currentOrg) {
    return (
      <div className="page-shell">
        <div className="page-shell__inner">
          <section className="lux-panel" style={{ minHeight: 340 }}>
            <EmptyState
              title="Организация не выбрана"
              description="Выберите пространство в боковой панели или создайте новое, чтобы открыть его параметры."
            />
          </section>
        </div>
      </div>
    );
  }

  const syncOrganization = (nextOrganization: orgsApi.Organization) => {
    setCurrentOrg(nextOrganization);
    setOrganizations(organizations.map((item) => (item.id === nextOrganization.id ? nextOrganization : item)));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const updated = await orgsApi.updateOrganization(currentOrg.id, {
        name: name.trim(),
        description: description.trim() || undefined,
      });

      syncOrganization(updated);
      setMessage('Параметры организации сохранены.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Не удалось сохранить изменения.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="page-shell__inner">
        <section className="lux-panel page-hero">
          <div className="page-hero__copy">
            <div className="page-hero__kicker">Организация</div>
            <h1 className="page-hero__title">{currentOrg.name}</h1>
            <p className="page-hero__description">
              Центр управления пространством: название, позиционирование, участники и структура. Всё собрано в одной
              светлой панели без лишнего визуального шума.
            </p>
            <div className="page-hero__meta">
              <span className="lux-pill">{currentOrg.memberCount} участников</span>
              <span className="lux-pill">Создано {new Date(currentOrg.createdAt).toLocaleDateString('ru-RU')}</span>
              <span className="lux-pill">Обновлено {new Date(currentOrg.updatedAt).toLocaleDateString('ru-RU')}</span>
            </div>
          </div>
          <div className="page-hero__actions">
            <Link className="lux-button-secondary" to="/organization/members">
              Управлять участниками
            </Link>
            <Link className="lux-button-ghost" to="/organization/departments">
              Открыть отделы
            </Link>
          </div>
        </section>

        <div className="page-grid page-grid--three">
          <section className="lux-panel stat-card">
            <span className="stat-card__value">{currentOrg.memberCount}</span>
            <span className="stat-card__label">Участников</span>
          </section>
          <section className="lux-panel stat-card">
            <span className="stat-card__value">{description.trim() ? 'Да' : 'Нет'}</span>
            <span className="stat-card__label">Описание заполнено</span>
          </section>
          <section className="lux-panel stat-card">
            <span className="stat-card__value">{new Date(currentOrg.updatedAt).toLocaleDateString('ru-RU')}</span>
            <span className="stat-card__label">Последнее обновление</span>
          </section>
        </div>

        <div className="page-grid page-grid--two">
          <section className="lux-panel stat-card">
            <div className="auth-shell__form-copy" style={{ marginBottom: 20 }}>
              <div className="auth-shell__form-title">Позиционирование</div>
              <div className="auth-shell__form-subtitle">Как пространство воспринимается внутри команды.</div>
            </div>

            <div className="collection-list">
              <article className="list-card">
                <div className="list-card__body">
                  <div className="list-card__title">Название организации</div>
                  <div className="list-card__subtitle" style={{ marginTop: 6 }}>
                    Короткое и уверенное имя помогает держать общий тон продукта и коммуникации.
                  </div>
                </div>
              </article>
              <article className="list-card">
                <div className="list-card__body">
                  <div className="list-card__title">Описание</div>
                  <div className="list-card__subtitle" style={{ marginTop: 6 }}>
                    {currentOrg.description || 'Сейчас описание не заполнено. Добавьте несколько строк, чтобы задать контекст.'}
                  </div>
                </div>
              </article>
              <article className="list-card">
                <div className="list-card__body">
                  <div className="list-card__title">Следующий шаг</div>
                  <div className="list-card__subtitle" style={{ marginTop: 6 }}>
                    После обновления карточки пространства можно перейти к отделам и приглашению участников.
                  </div>
                </div>
              </article>
            </div>
          </section>

          <section className="lux-panel stat-card">
            <div className="auth-shell__form-copy" style={{ marginBottom: 20 }}>
              <div className="auth-shell__form-title">Редактирование</div>
              <div className="auth-shell__form-subtitle">Настройте подачу и описание пространства.</div>
            </div>

            <form className="inline-form" onSubmit={handleSubmit}>
              <div className="field-group">
                <label className="field-group__label" htmlFor="organization-name">
                  Название
                </label>
                <input
                  id="organization-name"
                  className="lux-input"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </div>

              <div className="field-group">
                <label className="field-group__label" htmlFor="organization-description">
                  Описание
                </label>
                <textarea
                  id="organization-description"
                  className="lux-input"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={7}
                  placeholder="Опишите круг задач, стиль коммуникации или назначение пространства."
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
                <button className="lux-button" type="submit" disabled={saving}>
                  {saving ? 'Сохраняем...' : 'Сохранить изменения'}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
