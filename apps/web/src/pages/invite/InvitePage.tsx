import React, { useEffect, useState } from 'react';
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
    <div style={styles.container}>
      <div style={styles.card}>
        {loading ? (
          <div style={styles.center}>Загрузка...</div>
        ) : error || !info ? (
          <>
            <div style={styles.iconError}>⚠️</div>
            <h1 style={styles.title}>Приглашение недоступно</h1>
            <p style={styles.subtitle}>{error || 'Эта ссылка больше не работает.'}</p>
            <Link to="/" style={styles.linkBtn}>
              На главную
            </Link>
          </>
        ) : (
          <>
            {info.organizationLogo ? (
              <img src={info.organizationLogo} alt="" style={styles.logo} />
            ) : (
              <div style={styles.iconOrg}>🏢</div>
            )}
            <h1 style={styles.title}>Вступить в «{info.organizationName}»</h1>
            <p style={styles.subtitle}>
              Вы получили приглашение присоединиться к рабочему пространству. После вступления
              автоматически появится общий чат компании.
            </p>

            {user ? (
              <button style={styles.primaryBtn} onClick={handleAccept} disabled={accepting}>
                {accepting ? 'Присоединение...' : 'Присоединиться'}
              </button>
            ) : (
              <div style={styles.authActions}>
                <Link to={`/login?next=${encodeURIComponent(next)}`} style={styles.primaryBtn}>
                  Войти
                </Link>
                <Link to={`/register?next=${encodeURIComponent(next)}`} style={styles.secondaryBtn}>
                  Зарегистрироваться
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-secondary)', padding: 16 },
  card: { background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', padding: 'clamp(20px, 5vw, 36px)', width: '100%', maxWidth: 440, boxShadow: 'var(--shadow-lg)', textAlign: 'center' },
  center: { textAlign: 'center', color: 'var(--color-text-secondary)', padding: 40 },
  logo: { width: 72, height: 72, borderRadius: 16, margin: '0 auto 16px', objectFit: 'cover' as const, display: 'block' },
  iconOrg: { fontSize: 56, marginBottom: 12 },
  iconError: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 8px' },
  subtitle: { fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 24, lineHeight: 1.5 },
  primaryBtn: { display: 'inline-block', padding: '12px 24px', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--color-primary)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', minWidth: 160 },
  secondaryBtn: { display: 'inline-block', padding: '12px 24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text)', fontSize: 15, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', minWidth: 160 },
  authActions: { display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' },
  linkBtn: { display: 'inline-block', marginTop: 8, color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 500, fontSize: 14 },
};
