import { FormEvent, useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import * as authApi from '@/api/auth.api';
import { Modal } from '@/components/common/Modal';
import { useAuthStore } from '@/stores/auth.store';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function TwoFactorSetupModal({ open, onClose }: Props) {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [secret, setSecret] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [secretCopied, setSecretCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      setSecret('');
      setOtpauthUrl('');
      setCode('');
      setError('');
      setSecretCopied(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');
    authApi
      .setup2FA()
      .then((res) => {
        if (cancelled) return;
        setSecret(res.secret);
        setOtpauthUrl(res.otpauthUrl);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setError(err.response?.data?.error?.message || 'Не удалось получить ключ 2FA');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleVerify = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (code.trim().length !== 6) {
      setError('Введите 6-значный код');
      return;
    }
    setVerifying(true);
    try {
      await authApi.verify2FA(code.trim());
      if (user) {
        setUser({ ...user, twoFactorEnabled: true });
      }
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Неверный код, попробуйте ещё раз');
    } finally {
      setVerifying(false);
    }
  };

  const handleCopySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
    } catch {
      // ignore — clipboard may be denied; secret is still visible on-screen
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Включить 2FA">
      {loading ? (
        <div className="list-card__subtitle">Готовим ключ…</div>
      ) : (
        <form className="auth-shell__form" onSubmit={handleVerify}>
          {error && <div className="lux-alert">{error}</div>}

          <div className="list-card__subtitle">
            Откройте приложение-аутентификатор (Google Authenticator, 1Password, Authy)
            и отсканируйте QR-код или введите ключ вручную.
          </div>

          {otpauthUrl && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 12 }}>
              <div style={{ background: '#fff', padding: 12, borderRadius: 12 }}>
                <QRCodeSVG value={otpauthUrl} size={180} />
              </div>
            </div>
          )}

          {secret && (
            <div className="field-group">
              <label className="field-group__label">Секретный ключ</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="lux-input" value={secret} readOnly style={{ flex: 1 }} />
                <button
                  type="button"
                  className="lux-button-secondary"
                  onClick={handleCopySecret}
                >
                  {secretCopied ? 'Скопировано' : 'Копировать'}
                </button>
              </div>
            </div>
          )}

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
            <button className="lux-button" type="submit" disabled={verifying}>
              {verifying ? 'Проверяем...' : 'Включить 2FA'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
