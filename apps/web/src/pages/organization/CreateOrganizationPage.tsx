import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as orgsApi from '@/api/organizations.api';
import { useOrganizationStore } from '@/stores/organization.store';

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]+/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function CreateOrganizationPage() {
  const navigate = useNavigate();
  const organizations = useOrganizationStore((state) => state.organizations);
  const setOrganizations = useOrganizationStore((state) => state.setOrganizations);
  const setCurrentOrg = useOrganizationStore((state) => state.setCurrentOrg);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatedSlug = useMemo(() => slugify(name), [name]);
  const effectiveSlug = slugTouched ? slug : generatedSlug;

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
    if (!slugTouched) {
      setSlug(slugify(event.target.value));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedName = name.trim();
    const normalizedSlug = slugify(effectiveSlug);

    if (!normalizedName || !normalizedSlug) {
      setError('Укажите название и короткий адрес пространства.');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const organization = await orgsApi.createOrganization({
        name: normalizedName,
        slug: normalizedSlug,
        description: description.trim() || undefined,
      });

      setOrganizations([organization, ...organizations.filter((item) => item.id !== organization.id)]);
      setCurrentOrg(organization);
      navigate('/chats');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Не удалось создать пространство. Попробуйте ещё раз.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="page-shell" style={{ minHeight: '100vh', display: 'grid', alignContent: 'center' }}>
      <div className="page-shell__inner" style={{ width: 'min(1180px, 100%)' }}>
        <section className="lux-panel page-hero">
          <div className="page-hero__copy">
            <div className="page-hero__kicker">Новая организация</div>
            <h1 className="page-hero__title">Запустите своё закрытое рабочее пространство в светлом премиальном стиле.</h1>
            <p className="page-hero__description">
              Пространство станет центральной точкой для чатов, задач, файлов и управленческих процессов. Мы оставляем
              интерфейс чистым и статусным, чтобы команда чувствовала собранность с первого экрана.
            </p>
            <div className="page-hero__meta">
              <span className="lux-pill">Русский интерфейс</span>
              <span className="lux-pill">Мгновенный старт</span>
            </div>
          </div>
          <div className="page-hero__actions">
            <Link className="lux-button-secondary" to="/join-organization">
              Запросить доступ
            </Link>
            <Link className="lux-button-ghost" to="/login">
              Вернуться ко входу
            </Link>
          </div>
        </section>

        <div className="page-grid page-grid--two">
          <section className="lux-panel stat-card">
            <div className="collection-list">
              {[
                ['Личные каналы', 'Чаты, правые панели и рабочие контуры уже готовы к использованию.'],
                ['Управление доступом', 'После создания можно сразу приглашать людей и распределять роли.'],
                ['Единый стандарт', 'Организация автоматически откроется в обновлённом светлом интерфейсе.'],
              ].map(([title, description]) => (
                <article key={title} className="list-card">
                  <div className="list-card__body">
                    <div className="list-card__title">{title}</div>
                    <div className="list-card__subtitle" style={{ marginTop: 6 }}>
                      {description}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="lux-panel stat-card">
            <div className="auth-shell__form-copy" style={{ marginBottom: 20 }}>
              <div className="auth-shell__form-title">Создание пространства</div>
              <div className="auth-shell__form-subtitle">Пара штрихов, и можно заходить внутрь.</div>
              <div className="auth-shell__form-description">Короткий адрес используется в ссылках и внутренних интеграциях.</div>
            </div>

            <form className="inline-form" onSubmit={handleSubmit}>
              <div className="field-group">
                <label className="field-group__label" htmlFor="org-name">
                  Название
                </label>
                <input
                  id="org-name"
                  className="lux-input"
                  value={name}
                  onChange={handleNameChange}
                  placeholder="Совет директоров"
                  autoFocus
                  required
                />
              </div>

              <div className="field-group">
                <label className="field-group__label" htmlFor="org-slug">
                  Короткий адрес
                </label>
                <input
                  id="org-slug"
                  className="lux-input"
                  value={effectiveSlug}
                  onChange={(event) => {
                    setSlugTouched(true);
                    setSlug(event.target.value);
                  }}
                  placeholder="executive-council"
                  required
                />
              </div>

              <div className="field-group">
                <label className="field-group__label" htmlFor="org-description">
                  Описание
                </label>
                <textarea
                  id="org-description"
                  className="lux-input"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Коротко опишите назначение пространства и круг участников."
                  rows={5}
                  style={{ resize: 'vertical' }}
                />
              </div>

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
                <Link className="lux-button-ghost" to="/join-organization">
                  Есть приглашение
                </Link>
                <button className="lux-button" type="submit" disabled={creating}>
                  {creating ? 'Создаём пространство...' : 'Создать организацию'}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
