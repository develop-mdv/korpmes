import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as authApi from '@/api/auth.api';
import { AuthShell } from '@/components/layout/AuthShell';
import { useAuthStore } from '@/stores/auth.store';

export function RegisterPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({
    firstName: '',
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

    setLoading(true);
    try {
      const response = await authApi.register({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
      });
      setAuth(response.user, {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      });
      navigate('/chats');
    } catch (value: any) {
      setError(value.response?.data?.error?.message || 'Не удалось создать аккаунт');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Новый доступ"
      title="Создайте вход в рабочее пространство, которое выглядит дорого и работает быстро."
      description="Оформите аккаунт StaffHub и подключитесь к чатам, задачам, звонкам и структуре компании в едином светлом интерфейсе."
      formEyebrow="Регистрация"
      formTitle="Создать аккаунт"
      formDescription="Заполните профиль и получите доступ к рабочему контуру."
      quote="Премиальный опыт начинается с первых экранов, а не с последних."
      stats={[
        { label: 'Запуск', value: '3 мин' },
        { label: 'Приглашения', value: 'Мгновенно' },
        { label: 'Присутствие', value: 'Онлайн' },
      ]}
      footer={
        <>
          Уже есть аккаунт? <Link to="/login">Войти</Link>
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
