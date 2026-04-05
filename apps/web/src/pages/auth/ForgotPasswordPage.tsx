import React, { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // TODO: call forgotPassword API
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Reset Password</h1>

        {sent ? (
          <>
            <p style={styles.subtitle}>We've sent a reset link to <strong>{email}</strong></p>
            <Link to="/login" style={styles.button as any}>Back to Login</Link>
          </>
        ) : (
          <>
            <p style={styles.subtitle}>Enter your email and we'll send you a reset link</p>
            <form onSubmit={handleSubmit}>
              <div style={styles.field}>
                <input style={styles.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required autoFocus />
              </div>
              <button style={styles.button} type="submit" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
            <div style={styles.links}>
              <Link to="/login" style={styles.link}>Back to Login</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-secondary)', padding: 16 },
  card: { background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', padding: 40, width: '100%', maxWidth: 420, boxShadow: 'var(--shadow-lg)', textAlign: 'center' },
  title: { fontSize: 24, fontWeight: 700, color: 'var(--color-text)', margin: 0 },
  subtitle: { color: 'var(--color-text-secondary)', marginBottom: 24, fontSize: 14 },
  field: { marginBottom: 16 },
  input: { width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: 15, boxSizing: 'border-box' },
  button: { display: 'block', width: '100%', padding: 12, borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--color-primary)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', textAlign: 'center' },
  links: { marginTop: 20, fontSize: 14 },
  link: { color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 500 },
};
