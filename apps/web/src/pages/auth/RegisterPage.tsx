import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import * as authApi from '@/api/auth.api';
import { AuthShell } from '@/components/layout/AuthShell';
import { useAuthStore } from '@/stores/auth.store';
import { authRedirect } from '@/utils/navigation';
import { normalizeUsername, USERNAME_DESCRIPTION, USERNAME_PATTERN } from '@corp/shared-constants';

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = authRedirect(searchParams.get('next'));
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({
    firstName: '',
    username: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    if (form.password.length < 8) {
      setError('Пароль должен быть не короче 8 символов');
      return;
    }

    if (form.username.trim() && !USERNAME_PATTERN.test(normalizeUsername(form.username))) {
      setError(USERNAME_DESCRIPTION);
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.register({
        firstName: form.firstName,
        username: form.username.trim() ? normalizeUsername(form.username) : undefined,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
      });
      setAuth(response.user, {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      });
      navigate(next);
    } catch (value: any) {
      setError(value.response?.data?.error?.message || 'Не удалось создать аккаунт');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Новый доступ"
      title="Общайтесь лично и работайте с командой в одном аккаунте."
      description="Зарегистрируйтесь и начните переписку, создавайте группы и звоните. Организацию можно подключить позже — по приглашению или заявке."
      formEyebrow="Регистрация"
      formTitle="Создать аккаунт"
      formDescription="Личное пространство доступно сразу. Приглашение не требуется."
      quote="Личное общение и рабочие чаты — каждое в своём пространстве."
      stats={[
        { label: 'Запуск', value: '3 мин' },
        { label: 'Организация', value: 'По желанию' },
        { label: 'Присутствие', value: 'Онлайн' },
      ]}
      footer={
        <>
          Уже есть аккаунт? <Link to={`/login?next=${encodeURIComponent(next)}`}>Войти</Link>
        </>
      }
    >
      <form className="auth-shell__form" onSubmit={handleSubmit}>
        {error && <div className="lux-alert">{error}</div>}

        <div className="auth-shell__row">
          <div className="field-group">
            <label className="field-group__label">Имя</label>
            <input className="lux-input" value={form.firstName} onChange={(event) => updateField('firstName', event.target.value)} required />
          </div>
          <div className="field-group">
            <label className="field-group__label">Фамилия</label>
            <input className="lux-input" value={form.lastName} onChange={(event) => updateField('lastName', event.target.value)} required />
          </div>
        </div>

        <div className="field-group">
          <label className="field-group__label">Email</label>
          <input className="lux-input" type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} required />
        </div>

        <div className="field-group">
          <label className="field-group__label" htmlFor="register-username">Никнейм (необязательно)</label>
          <input id="register-username" className="lux-input" value={form.username} onChange={(event) => updateField('username', event.target.value)} placeholder="@nickname" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
          <div className="list-card__subtitle">{USERNAME_DESCRIPTION} Если оставить пустым, назначим уникальный ник — его можно изменить в настройках.</div>
        </div>

        <div className="field-group">
          <label className="field-group__label">Телефон</label>
          <input className="lux-input" type="tel" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} placeholder="+7..." />
        </div>

        <div className="field-group">
          <label className="field-group__label">Пароль</label>
          <input className="lux-input" type="password" value={form.password} onChange={(event) => updateField('password', event.target.value)} minLength={8} required />
        </div>

        <div className="field-group">
          <label className="field-group__label">Подтвердите пароль</label>
          <input className="lux-input" type="password" value={form.confirmPassword} onChange={(event) => updateField('confirmPassword', event.target.value)} required />
        </div>

        <button className="lux-button" type="submit" disabled={loading}>
          {loading ? 'Создаём аккаунт...' : 'Создать аккаунт'}
        </button>
      </form>
    </AuthShell>
  );
}
