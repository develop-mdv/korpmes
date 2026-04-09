import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthShell } from '@/components/layout/AuthShell';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Восстановление"
      title="Верните доступ без лишнего шума и лишних экранов."
      description="Сбросьте пароль и вернитесь в рабочее пространство StaffHub через чистый и понятный сценарий."
      formEyebrow="Сброс доступа"
      formTitle="Восстановить пароль"
      formDescription="Мы отправим ссылку для восстановления на вашу почту."
      quote="Даже восстановление должно ощущаться спокойно и уверенно."
      stats={[
        { label: 'Доставка', value: 'Безопасно' },
        { label: 'Сценарий', value: 'Просто' },
        { label: 'Возврат', value: 'Быстро' },
      ]}
      footer={<Link to="/login">Назад ко входу</Link>}
    >
      {sent ? (
        <div className="inline-form">
          <div className="lux-panel" style={{ padding: 18 }}>
            <div className="list-card__title">Письмо отправлено</div>
            <div className="list-card__subtitle" style={{ marginTop: 8 }}>
              Мы отправили ссылку для восстановления на <strong>{email}</strong>.
            </div>
          </div>
          <Link to="/login" className="lux-button">
            Вернуться ко входу
          </Link>
        </div>
      ) : (
        <form className="auth-shell__form" onSubmit={handleSubmit}>
          <div className="field-group">
            <label className="field-group__label">Email</label>
            <input className="lux-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" autoFocus required />
          </div>
          <button className="lux-button" type="submit" disabled={loading}>
            {loading ? 'Отправляем ссылку...' : 'Отправить ссылку'}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
