import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import * as orgsApi from '@/api/organizations.api';

export function InvitePage() {
  const { token = '' } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [info, setInfo] = useState<orgsApi.InvitePublicInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Неверная ссылка');
      setLoading(false);
      return;
    }
    orgsApi
      .getInviteInfo(token)
      .then((data) => {
        if (!data) {
          setError('Ссылка недействительна или была отозвана');
        } else {
          setInfo(data);
        }
      })
      .catch(() => setError('Не удалось загрузить информацию о приглашении'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleAccept = async () => {
    setAccepting(true);
    setError('');
    try {
      await orgsApi.acceptInvite(token);
      navigate('/chats');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Не удалось присоединиться');
    } finally {
      setAccepting(false);
    }
  };

  const next = `/invite/${token}`;

  return (
    <div className="page-shell">
      <div className="page-shell__inner" style={{ maxWidth: 540 }}>
        <section className="lux-panel page-hero" style={{ textAlign: 'center' }}>
          {loading ? (
            <p className="page-hero__description">Загрузка приглашения…</p>
          ) : error || !info ? (
            <div className="page-hero__copy">
              <div className="page-hero__kicker">Приглашение</div>
              <h1 className="page-hero__title">Ссылка недоступна</h1>
              <p className="page-hero__description">{error || 'Эта ссылка больше не работает.'}</p>
              <div className="page-hero__actions">
                <Link to="/" className="lux-button-secondary">
                  На главную
                </Link>
              </div>
            </div>
          ) : (
            <div className="page-hero__copy">
              {info.organizationLogo && (
                <img
                  src={info.organizationLogo}
                  alt=""
                  style={{ width: 84, height: 84, borderRadius: 20, margin: '0 auto 18px', objectFit: 'cover', display: 'block' }}
                />
              )}
              <div className="page-hero__kicker">Приглашение в пространство</div>
              <h1 className="page-hero__title">Вступить в «{info.organizationName}»</h1>
              <p className="page-hero__description">
                Вы получили приглашение присоединиться к рабочему пространству. После вступления автоматически появится общий чат компании.
              </p>

              <div className="page-hero__actions">
                {user ? (
                  <button className="lux-button" onClick={handleAccept} disabled={accepting}>
                    {accepting ? 'Присоединение…' : 'Присоединиться'}
                  </button>
                ) : (
                  <>
                    <Link to={`/login?next=${encodeURIComponent(next)}`} className="lux-button">
                      Войти
                    </Link>
                    <Link to={`/register?next=${encodeURIComponent(next)}`} className="lux-button-secondary">
                      Зарегистрироваться
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
