import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { useOrganizationStore } from '@/stores/organization.store';
import { useUIStore } from '@/stores/ui.store';

export function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);
  const currentOrg = useOrganizationStore((state) => state.currentOrg);
  const theme = useUIStore((state) => state.theme);
  const setTheme = useUIStore((state) => state.setTheme);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setFirstName(user?.firstName ?? '');
    setLastName(user?.lastName ?? '');
    setPhone(user?.phone ?? '');
  }, [user]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    setUser({
      ...user,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim() || undefined,
    });
    setMessage('Локальные настройки профиля обновлены.');
  };

  return (
    <div className="page-shell">
      <div className="page-shell__inner">
        <section className="lux-panel page-hero">
          <div className="page-hero__copy">
            <div className="page-hero__kicker">Настройки</div>
            <h1 className="page-hero__title">Профиль, тема и сессия.</h1>
            <p className="page-hero__description">
              Всё персональное собрано здесь, чтобы боковое меню оставалось лёгким и не отвлекало от работы.
            </p>
            <div className="page-hero__meta">
              <span className="lux-pill">Язык: русский</span>
              <span className="lux-pill">Тема: {theme === 'light' ? 'светлая' : 'тёмная'}</span>
              {currentOrg && <span className="lux-pill">Организация: {currentOrg.name}</span>}
            </div>
          </div>
        </section>

        <div className="page-grid page-grid--two">
          <section className="lux-panel stat-card">
            <div className="auth-shell__form-copy" style={{ marginBottom: 20 }}>
              <div className="auth-shell__form-title">Профиль</div>
              <div className="auth-shell__form-subtitle">Базовые данные пользователя</div>
            </div>

            <form className="inline-form" onSubmit={handleSubmit}>
              <div className="auth-shell__row">
                <div className="field-group">
                  <label className="field-group__label" htmlFor="settings-first-name">
                    Имя
                  </label>
                  <input
                    id="settings-first-name"
                    className="lux-input"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                  />
                </div>

                <div className="field-group">
                  <label className="field-group__label" htmlFor="settings-last-name">
                    Фамилия
                  </label>
                  <input
                    id="settings-last-name"
                    className="lux-input"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                  />
                </div>
              </div>

              <div className="field-group">
                <label className="field-group__label" htmlFor="settings-email">
                  Email
                </label>
                <input id="settings-email" className="lux-input" value={user?.email ?? ''} readOnly />
              </div>

              <div className="field-group">
                <label className="field-group__label" htmlFor="settings-phone">
                  Телефон
                </label>
                <input
                  id="settings-phone"
                  className="lux-input"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+7 999 000-00-00"
                />
              </div>

              {message && <div className="lux-alert lux-alert--success">{message}</div>}

              <div className="form-actions">
                <button className="lux-button" type="submit">
                  Сохранить профиль
                </button>
              </div>
            </form>
          </section>

          <section className="page-grid" style={{ gap: 18 }}>
            <section className="lux-panel stat-card">
              <div className="auth-shell__form-copy" style={{ marginBottom: 18 }}>
                <div className="auth-shell__form-title">Оформление</div>
                <div className="auth-shell__form-subtitle">Смена темы теперь живёт только здесь</div>
              </div>
              <div className="theme-choice">
                <button
                  className={theme === 'light' ? 'theme-choice__item is-active' : 'theme-choice__item'}
                  type="button"
                  onClick={() => setTheme('light')}
                >
                  <span className="theme-choice__swatch theme-choice__swatch--light" />
                  <span>
                    <strong>Светлая</strong>
                    <small>Основная тема интерфейса</small>
                  </span>
                </button>
                <button
                  className={theme === 'dark' ? 'theme-choice__item is-active' : 'theme-choice__item'}
                  type="button"
                  onClick={() => setTheme('dark')}
                >
                  <span className="theme-choice__swatch theme-choice__swatch--dark" />
                  <span>
                    <strong>Тёмная</strong>
                    <small>Для вечерней работы</small>
                  </span>
                </button>
              </div>
            </section>

            <section className="lux-panel stat-card">
              <div className="auth-shell__form-copy" style={{ marginBottom: 18 }}>
                <div className="auth-shell__form-title">Безопасность</div>
                <div className="auth-shell__form-subtitle">
                  Двухфакторная защита {user?.twoFactorEnabled ? 'включена' : 'пока не включена'}.
                </div>
              </div>
              <div className="collection-list">
                <article className="list-card">
                  <div className="list-card__body">
                    <div className="list-card__title">Основной язык</div>
                    <div className="list-card__subtitle" style={{ marginTop: 6 }}>
                      Русский закреплён как основной язык интерфейса.
                    </div>
                  </div>
                </article>
                <article className="list-card">
                  <div className="list-card__body">
                    <div className="list-card__title">Статус 2FA</div>
                    <div className="list-card__subtitle" style={{ marginTop: 6 }}>
                      {user?.twoFactorEnabled ? 'Дополнительный уровень защиты активен.' : 'Управление 2FA можно добавить следующим шагом через API.'}
                    </div>
                  </div>
                </article>
              </div>
            </section>

            <section className="lux-panel stat-card">
              <div className="auth-shell__form-copy" style={{ marginBottom: 18 }}>
                <div className="auth-shell__form-title">Сессия</div>
                <div className="auth-shell__form-subtitle">Быстрые действия без перегруза бокового меню</div>
              </div>
              <div className="collection-list" style={{ marginBottom: 18 }}>
                <article className="list-card">
                  <div className="list-card__body">
                    <div className="list-card__title">{currentOrg?.name || 'Организация не выбрана'}</div>
                    <div className="list-card__subtitle" style={{ marginTop: 6 }}>
                      {currentOrg ? 'Структура и управление пространством доступны в разделе организации.' : 'Выберите организацию, чтобы открыть её настройки.'}
                    </div>
                  </div>
                </article>
              </div>
              <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
                <Link className="lux-button-secondary" to="/organization">
                  Открыть организацию
                </Link>
                <button className="lux-button-danger" type="button" onClick={logout}>
                  Выйти из аккаунта
                </button>
              </div>
            </section>
          </section>
        </div>
      </div>
    </div>
  );
}
