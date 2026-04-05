import React, { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import * as authApi from '@/api/auth.api';
import { useAuthStore } from '@/stores/auth.store';

export function RegisterPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const updateField = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.register({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
      });
      setAuth(response.user, {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      });
      navigate('/chats');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Create Account</h1>
        <p style={styles.subtitle}>Join CorpMessenger</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>First Name</label>
              <input style={styles.input} value={form.firstName} onChange={(e) => updateField('firstName', e.target.value)} required />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Last Name</label>
              <input style={styles.input} value={form.lastName} onChange={(e) => updateField('lastName', e.target.value)} required />
            </div>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input style={styles.input} type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} required />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Phone (optional)</label>
            <input style={styles.input} type="tel" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="+7..." />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input style={styles.input} type="password" value={form.password} onChange={(e) => updateField('password', e.target.value)} required minLength={8} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Confirm Password</label>
            <input style={styles.input} type="password" value={form.confirmPassword} onChange={(e) => updateField('confirmPassword', e.target.value)} required />
          </div>
          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>

        <div style={styles.links}>
          Already have an account? <Link to="/login" style={styles.link}>Sign In</Link>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-secondary)', padding: 16 },
  card: { background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', padding: 40, width: '100%', maxWidth: 460, boxShadow: 'var(--shadow-lg)' },
  title: { fontSize: 24, fontWeight: 700, textAlign: 'center', color: 'var(--color-text)', margin: 0 },
  subtitle: { textAlign: 'center', color: 'var(--color-text-secondary)', marginBottom: 24, fontSize: 14 },
  error: { background: '#FEE2E2', color: '#DC2626', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: 14, marginBottom: 16 },
  row: { display: 'flex', gap: 12 },
  field: { marginBottom: 14, flex: 1 },
  label: { display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--color-text)', marginBottom: 6 },
  input: { width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: 15, color: 'var(--color-text)', background: 'var(--color-bg-secondary)', outline: 'none', boxSizing: 'border-box' },
  button: { width: '100%', padding: 12, borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--color-primary)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 8 },
  links: { textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--color-text-secondary)' },
  link: { color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 500 },
};
