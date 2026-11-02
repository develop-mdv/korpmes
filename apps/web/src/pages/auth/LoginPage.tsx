import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import * as authApi from '@/api/auth.api';
import { AuthShell } from '@/components/layout/AuthShell';
import { useAuthStore } from '@/stores/auth.store';
import { authRedirect } from '@/utils/navigation';

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = authRedirect(searchParams.get('next'));
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
      navigate(next);
    } catch (value: any) {
      setError(value.response?.data?.error?.message || 'Не удалось войти');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Светлый премиум"
      title="Личное общение и работа с командой в одном месте."
      description="Войдите в личное пространство или переключитесь на организацию. Для личной переписки приглашение не требуется."
      formEyebrow="Безопасный вход"
      formTitle="Войти в StaffHub"
      formDescription="Войдите, чтобы продолжить общение."
      quote="Один аккаунт для личных диалогов и рабочих пространств."
      stats={[
        { label: 'Скорость', value: '< 1 сек' },
        { label: 'Пространства', value: 'Закрытые' },
        { label: 'Защита', value: '2FA' },
      ]}
      footer={
        <>
          <Link to="/forgot-password">Забыли пароль?</Link> {' · '}
          <Link to={`/register?next=${encodeURIComponent(next)}`}>Создать аккаунт</Link>
        </>
      }
    >
      <form className="auth-shell__form" onSubmit={handleSubmit}>
        {error && <div className="lux-alert">{error}</div>}

        <div className="field-group">
          <label className="field-group__label">Email</label>
          <input className="lux-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoFocus required />
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
