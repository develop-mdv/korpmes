import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import * as authApi from '@/api/auth.api';
import { AuthShell } from '@/components/layout/AuthShell';

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,128}$/;

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (!token) {
      setError('Ссылка для восстановления повреждена или устарела.');
      return;
    }
    if (password !== confirm) {
      setError('Пароли не совпадают.');
      return;
    }
    if (!PASSWORD_RULE.test(password)) {
      setError(
        'Пароль должен содержать 8+ символов: строчную и заглавную буквы, цифру и спецсимвол (!@#$%^&*).',
      );
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message ||
          'Не удалось обновить пароль. Запросите новую ссылку.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Восстановление"
      title="Установите новый пароль и продолжайте работу."
      description="Введите новый пароль — мы немедленно обновим доступ и завершим все активные сессии."
      formEyebrow="Новый пароль"
      formTitle="Сменить пароль"
      formDescription="Минимум 8 символов, со строчной, заглавной, цифрой и спецсимволом."
      quote="Безопасность — это привычка, а не ритуал."
      stats={[
        { label: 'Применение', value: 'Мгновенно' },
        { label: 'Сессии', value: 'Сбрасываются' },
        { label: 'Защита', value: 'Высокая' },
      ]}
      footer={<Link to="/login">Вернуться ко входу</Link>}
    >
      {done ? (
        <div className="inline-form">
          <div className="lux-panel" style={{ padding: 18 }}>
            <div className="list-card__title">Пароль обновлён</div>
            <div className="list-card__subtitle" style={{ marginTop: 8 }}>
              Войдите с новым паролем — старые сессии завершены.
            </div>
          </div>
          <button className="lux-button" type="button" onClick={() => navigate('/login')}>
            Перейти ко входу
          </button>
        </div>
      ) : (
        <form className="auth-shell__form" onSubmit={handleSubmit}>
          {error && <div className="lux-alert">{error}</div>}

          <div className="field-group">
            <label className="field-group__label">Новый пароль</label>
            <input
              className="lux-input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Минимум 8 символов"
              autoFocus
              required
            />
          </div>

          <div className="field-group">
            <label className="field-group__label">Повторите пароль</label>
            <input
              className="lux-input"
              type="password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              placeholder="Тот же пароль"
              required
            />
          </div>

          <button className="lux-button" type="submit" disabled={loading || !token}>
            {loading ? 'Сохраняем...' : 'Сохранить пароль'}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
