import React, { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganizationStore } from '@/stores/organization.store';
import * as orgsApi from '@/api/organizations.api';

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function CreateOrganizationPage() {
  const navigate = useNavigate();
  const { setOrganizations, setCurrentOrg } = useOrganizationStore();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slugEdited) {
      setSlug(toSlug(val));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const org = await orgsApi.createOrganization({
        name,
        slug: slug || toSlug(name),
        description: description || undefined,
      });
      setOrganizations([org]);
      setCurrentOrg(org);
      navigate('/chats');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create organization');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logoIcon}>CM</div>
        <h1 style={styles.title}>Create your workspace</h1>
        <p style={styles.subtitle}>Set up an organization to start using CorpMessenger</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label}>Organization Name *</label>
            <input
              style={styles.input}
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="My Company"
              required
              autoFocus
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Slug</label>
            <input
              style={styles.input}
              value={slug}
              onChange={(e) => { setSlug(e.target.value); setSlugEdited(true); }}
              placeholder="my-company"
            />
            <p style={styles.hint}>Used in URLs. Auto-generated from name.</p>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Description (optional)</label>
            <textarea
              style={{ ...styles.input, minHeight: 60, resize: 'vertical' }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does your organization do?"
            />
          </div>

          <button style={styles.button} type="submit" disabled={loading || !name.trim()}>
            {loading ? 'Creating...' : 'Create Organization'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-secondary)', padding: 16 },
  card: { background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', padding: 40, width: '100%', maxWidth: 460, boxShadow: 'var(--shadow-lg)', textAlign: 'center' },
  logoIcon: { width: 48, height: 48, borderRadius: 12, background: 'var(--color-primary)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 4px' },
  subtitle: { fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 24 },
  error: { background: '#FEE2E2', color: '#DC2626', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: 14, marginBottom: 16, textAlign: 'left' },
  field: { marginBottom: 16, textAlign: 'left' },
  label: { display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--color-text)', marginBottom: 6 },
  input: { width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: 15, color: 'var(--color-text)', background: 'var(--color-bg-secondary)', outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit' },
  hint: { fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 4 },
  button: { width: '100%', padding: 12, borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--color-primary)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 8 },
};
