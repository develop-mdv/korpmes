import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as authApi from '@/api/auth.api';
import { AuthShell } from '@/components/layout/AuthShell';
import { useAuthStore } from '@/stores/auth.store';

export function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authApi.login(email, password, twoFactorCode || undefined);

      if (response.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        setLoading(false);
        return;
      }

      setAuth(response.user, {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      });
      navigate('/chats');
    } catch (value: any) {
      setError(value.response?.data?.error?.message || 'Не удалось войти');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Светлый премиум"
      title="Коммуникации для команд, которым важны вкус, контроль и скорость."
      description="StaffHub открывает приватное рабочее пространство с чатами, задачами, звонками и структурой компании в едином светлом премиум-интерфейсе."
      formEyebrow="Безопасный вход"
      formTitle="Войти в StaffHub"
      formDescription="Авторизуйтесь и вернитесь в своё рабочее пространство."
      quote="Когда продукт выглядит уверенно, работать в нём хочется дольше."
      stats={[
        { label: 'Скорость', value: '< 1 сек' },
        { label: 'Пространства', value: 'Закрытые' },
        { label: 'Защита', value: '2FA' },
      ]}
      footer={
        <>
          <Link to="/forgot-password">Забыли пароль?</Link> {' · '}
          <Link to="/register">Создать аккаунт</Link>
        </>
      }
    >
      <form className="auth-shell__form" onSubmit={handleSubmit}>
        {error && <div className="lux-alert">{error}</div>}

        <div className="field-group">
          <label className="field-group__label">Email</label>
          <input className="lux-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" autoFocus required />
        </div>

        <div className="field-group">
          <label className="field-group__label">Пароль</label>
          <input className="lux-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Введите пароль" required />
        </div>

        {requiresTwoFactor && (
          <div className="field-group">
            <label className="field-group__label">Код двухфакторной защиты</label>
            <input className="lux-input" type="text" value={twoFactorCode} onChange={(event) => setTwoFactorCode(event.target.value)} placeholder="6-значный код" maxLength={6} autoFocus />
          </div>
        )}

        <button className="lux-button" type="submit" disabled={loading}>
          {loading ? 'Проверяем доступ...' : 'Войти'}
        </button>
      </form>
    </AuthShell>
  );
}
