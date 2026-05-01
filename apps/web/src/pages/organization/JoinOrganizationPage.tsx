import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as orgsApi from '@/api/organizations.api';
import { useOrganizationStore } from '@/stores/organization.store';

export function JoinOrganizationPage() {
  const navigate = useNavigate();
  const organizations = useOrganizationStore((state) => state.organizations);
  const setOrganizations = useOrganizationStore((state) => state.setOrganizations);
  const setCurrentOrg = useOrganizationStore((state) => state.setCurrentOrg);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<orgsApi.Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (organizations.length > 0) {
      return;
    }

    orgsApi
      .getOrganizations()
      .then((items) => {
        setOrganizations(items);
      })
      .catch(() => {
        // Best-effort load for quick access cards.
      });
  }, [organizations.length, setOrganizations]);

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const timeoutId = window.setTimeout(() => {
      orgsApi
        .searchOrganizations(trimmedQuery)
        .then((items) => setResults(items))
        .catch(() => setError('Не удалось выполнить поиск. Попробуйте повторить запрос.'))
        .finally(() => setLoading(false));
    }, 260);

    return () => window.clearTimeout(timeoutId);
  }, [query]);

  const handleEnter = (organization: orgsApi.Organization) => {
    setCurrentOrg(organization);
    navigate('/chats');
  };

  const handleRequestJoin = async (organizationId: string) => {
    setRequestingId(organizationId);
    setMessage(null);
    setError(null);

    try {
      await orgsApi.requestJoin(organizationId);
      setMessage('Запрос на вступление отправлен. Как только доступ подтвердят, пространство появится в списке.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Не удалось отправить запрос на вступление.');
    } finally {
      setRequestingId(null);
    }
  };

  return (
    <main className="page-shell" style={{ minHeight: '100vh', display: 'grid', alignContent: 'center' }}>
      <div className="page-shell__inner" style={{ width: 'min(1180px, 100%)' }}>
        <section className="lux-panel page-hero">
          <div className="page-hero__copy">
            <div className="page-hero__kicker">Доступ к организации</div>
            <h1 className="page-hero__title">Найдите нужное пространство и отправьте деликатный запрос на вход.</h1>
            <p className="page-hero__description">
              Мы сделали поток максимально мягким: если вы уже состоите в организации, можно сразу войти внутрь. Если
              доступа пока нет, достаточно одного запроса без лишней бюрократии.
            </p>
            <div className="page-hero__meta">
              <span className="lux-pill">{organizations.length} доступных пространств</span>
              <span className="lux-pill">Поиск по названию</span>
            </div>
          </div>
          <div className="page-hero__actions">
            <Link className="lux-button-secondary" to="/create-organization">
              Создать своё пространство
            </Link>
          </div>
        </section>

        <div className="page-grid page-grid--two">
          <section className="lux-panel stat-card">
            <div className="auth-shell__form-copy" style={{ marginBottom: 20 }}>
              <div className="auth-shell__form-title">Поиск организаций</div>
              <div className="auth-shell__form-subtitle">Введите часть названия</div>
              <div className="auth-shell__form-description">Например: холдинг, совет, штаб, studio, capital.</div>
            </div>

            <div className="inline-form">
              <div className="field-group">
                <label className="field-group__label" htmlFor="org-search">
                  Запрос
                </label>
                <input
                  id="org-search"
                  className="lux-input"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Начните вводить название организации"
                  autoFocus
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

              <div className="collection-list">
                {loading ? (
                  <div className="list-card">
                    <div className="list-card__body">
                      <div className="list-card__title">Ищем подходящие организации...</div>
                    </div>
                  </div>
                ) : results.length > 0 ? (
                  results.map((organization) => (
                    <article key={organization.id} className="list-card">
                      <div className="list-card__body">
                        <div className="list-card__title">{organization.name}</div>
                        <div className="list-card__subtitle" style={{ marginTop: 6 }}>
                          {organization.description || 'Описание пока не заполнено.'}
                        </div>
                        <div className="list-card__meta">
                          <span>{organization.memberCount} участников</span>
                          <span>Обновлено {new Date(organization.updatedAt).toLocaleDateString('ru-RU')}</span>
                        </div>
                      </div>
                      <div className="list-card__actions">
                        <button
                          className="lux-button"
                          type="button"
                          onClick={() => handleRequestJoin(organization.id)}
                          disabled={requestingId === organization.id}
                        >
                          {requestingId === organization.id ? 'Отправляем...' : 'Запросить доступ'}
                        </button>
                      </div>
                    </article>
                  ))
                ) : query.trim().length >= 2 ? (
                  <div className="list-card">
                    <div className="list-card__body">
                      <div className="list-card__title">Совпадений пока нет</div>
                      <div className="list-card__subtitle" style={{ marginTop: 6 }}>
                        Попробуйте другую формулировку или попросите владельца выслать прямое приглашение.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="list-card">
                    <div className="list-card__body">
                      <div className="list-card__title">Ожидаем запрос</div>
                      <div className="list-card__subtitle" style={{ marginTop: 6 }}>
                        Поиск начнётся, когда вы введёте хотя бы две буквы.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="lux-panel stat-card">
            <div className="auth-shell__form-copy" style={{ marginBottom: 20 }}>
              <div className="auth-shell__form-title">Ваши пространства</div>
              <div className="auth-shell__form-subtitle">Мгновенный вход туда, где доступ уже открыт.</div>
            </div>

            <div className="collection-list">
              {organizations.length === 0 ? (
                <div className="list-card">
                  <div className="list-card__body">
                    <div className="list-card__title">Пока пусто</div>
                    <div className="list-card__subtitle" style={{ marginTop: 6 }}>
                      После подтверждения доступа организация появится здесь и станет доступна для быстрого входа.
                    </div>
                  </div>
                </div>
              ) : (
                organizations.map((organization) => (
                  <article key={organization.id} className="list-card">
                    <div className="list-card__body">
                      <div className="list-card__title">{organization.name}</div>
                      <div className="list-card__subtitle" style={{ marginTop: 6 }}>
                        {organization.description || 'Пространство готово к работе.'}
                      </div>
                      <div className="list-card__meta">
                        <span>{organization.memberCount} участников</span>
                        <span>Создано {new Date(organization.createdAt).toLocaleDateString('ru-RU')}</span>
                      </div>
                    </div>
                    <div className="list-card__actions">
                      <button className="lux-button-secondary" type="button" onClick={() => handleEnter(organization)}>
                        Открыть
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
