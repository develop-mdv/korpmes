import { FormEvent, useEffect, useState } from 'react';
import * as authApi from '@/api/auth.api';
import { Modal } from '@/components/common/Modal';
import { useAuthStore } from '@/stores/auth.store';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function TwoFactorDisableModal({ open, onClose }: Props) {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setCode('');
      setError('');
    }
  }, [open]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (code.trim().length !== 6) {
      setError('Введите 6-значный код');
      return;
    }
    setLoading(true);
    try {
      await authApi.disable2FA(code.trim());
      if (user) {
        setUser({ ...user, twoFactorEnabled: false });
      }
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Неверный код, попробуйте ещё раз');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Отключить 2FA">
      <form className="auth-shell__form" onSubmit={handleSubmit}>
        {error && <div className="lux-alert">{error}</div>}

        <div className="list-card__subtitle">
          Подтвердите отключение двухфакторной защиты — введите код из приложения-аутентификатора.
        </div>

        <div className="field-group">
          <label className="field-group__label">Код из приложения</label>
          <input
            className="lux-input"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="6-значный код"
            maxLength={6}
            autoFocus
            inputMode="numeric"
          />
        </div>

        <div className="form-actions">
          <button type="button" className="lux-button-secondary" onClick={onClose}>
            Отмена
          </button>
          <button className="lux-button-danger" type="submit" disabled={loading}>
            {loading ? 'Отключаем...' : 'Отключить 2FA'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
