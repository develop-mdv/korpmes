import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
      setError('Неверная ссылка приглашения');
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
      setError(err.response?.data?.error?.message || 'Не удалось присоединиться к организации');
    } finally {
      setAccepting(false);
    }
  };

  const next = `/invite/${token}`;

  return (
    <div className="page-shell">
      <div className="page-shell__inner" style={{ maxWidth: 560 }}>
        <section className="lux-panel page-hero" style={{ textAlign: 'center' }}>
          {loading ? (
            <div className="page-hero__copy">
              <div className="page-hero__kicker">Приглашение</div>
              <h1 className="page-hero__title">Проверяем доступ.</h1>
              <p className="page-hero__description">Загружаем приглашение...</p>
            </div>
          ) : error || !info ? (
            <div className="page-hero__copy">
              <div className="page-hero__kicker">Приглашение</div>
              <h1 className="page-hero__title">Ссылка недоступна.</h1>
              <p className="page-hero__description">
                {error || 'Эта ссылка больше не работает. Попросите администратора отправить новое приглашение.'}
              </p>
              <div className="page-hero__actions" style={{ justifyContent: 'center' }}>
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
                  alt="Логотип организации"
                  style={{
                    width: 84,
                    height: 84,
                    borderRadius: 24,
                    margin: '0 auto 18px',
                    objectFit: 'cover',
                    display: 'block',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                />
              )}
              <div className="page-hero__kicker">Доступ в пространство</div>
              <h1 className="page-hero__title">Вступить в «{info.organizationName}»</h1>
              <p className="page-hero__description">
                Вас пригласили в рабочее пространство. После входа общий чат и командные инструменты появятся автоматически.
              </p>

              <div className="page-hero__actions" style={{ justifyContent: 'center' }}>
                {user ? (
                  <button className="lux-button" onClick={handleAccept} disabled={accepting} type="button">
                    {accepting ? 'Присоединяем...' : 'Присоединиться'}
                  </button>
                ) : (
                  <>
                    <Link to={`/login?next=${encodeURIComponent(next)}`} className="lux-button">
                      Войти
                    </Link>
                    <Link to={`/register?next=${encodeURIComponent(next)}`} className="lux-button-secondary">
                      Создать аккаунт
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
