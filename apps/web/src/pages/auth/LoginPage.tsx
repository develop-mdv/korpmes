import React, { useState, FormEvent } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import * as authApi from '@/api/auth.api';

function safeNext(next: string | null): string {
  if (!next) return '/chats';
  // Only allow internal paths to prevent open-redirect.
  if (next.startsWith('/') && !next.startsWith('//')) return next;
  return '/chats';
}

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = safeNext(searchParams.get('next'));
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
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
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <div style={styles.logoIcon}>CM</div>
          <h1 style={styles.title}>CorpMessenger</h1>
        </div>
        <p style={styles.subtitle}>Sign in to your workspace</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              style={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              autoFocus
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          {requiresTwoFactor && (
            <div style={styles.field}>
              <label style={styles.label}>Two-Factor Code</label>
              <input
                style={styles.input}
                type="text"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                placeholder="Enter 6-digit code"
                maxLength={6}
                autoFocus
              />
            </div>
          )}

          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={styles.links}>
          <Link to="/forgot-password" style={styles.link}>Forgot password?</Link>
          <span style={styles.separator}>|</span>
          <Link
            to={next === '/chats' ? '/register' : `/register?next=${encodeURIComponent(next)}`}
            style={styles.link}
          >
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--color-bg-secondary)',
    padding: 16,
  },
  card: {
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-lg)',
    padding: 40,
    width: '100%',
    maxWidth: 420,
    boxShadow: 'var(--shadow-lg)',
  },
  logo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    background: 'var(--color-primary)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 18,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: 'var(--color-text)',
    margin: 0,
  },
  subtitle: {
    textAlign: 'center',
    color: 'var(--color-text-secondary)',
    marginBottom: 24,
    fontSize: 14,
  },
  error: {
    background: '#FEE2E2',
    color: '#DC2626',
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    fontSize: 14,
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    display: 'block',
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--color-text)',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    fontSize: 15,
    color: 'var(--color-text)',
    background: 'var(--color-bg-secondary)',
    outline: 'none',
    boxSizing: 'border-box',
  },
  button: {
    width: '100%',
    padding: '12px',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    background: 'var(--color-primary)',
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 8,
  },
  links: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
  },
  link: {
    color: 'var(--color-primary)',
    textDecoration: 'none',
    fontWeight: 500,
  },
  separator: {
    margin: '0 8px',
    color: 'var(--color-text-tertiary)',
  },
};
