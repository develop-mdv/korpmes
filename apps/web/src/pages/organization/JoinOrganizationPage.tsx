import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import * as orgsApi from '@/api/organizations.api';

interface OrgResult {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
}

export function JoinOrganizationPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<OrgResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [requestSent, setRequestSent] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Load top orgs on mount
  useEffect(() => {
    setSearching(true);
    orgsApi.searchOrganizations('').then(setResults).catch(() => setResults([])).finally(() => setSearching(false));
  }, []);

  // Debounced search on query change
  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const orgs = await orgsApi.searchOrganizations(query);
        setResults(orgs);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timerRef.current);
  }, [query]);

  const handleRequestJoin = async (orgId: string) => {
    setError('');
    try {
      await orgsApi.requestJoin(orgId);
      setRequestSent((prev) => ({ ...prev, [orgId]: true }));
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to send request');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Join an Organization</h1>
        <p style={styles.subtitle}>Search for your company's workspace</p>

        {error && <div style={styles.error}>{error}</div>}

        <input
          style={styles.input}
          placeholder="Search organizations..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />

        <div style={styles.resultsList}>
          {searching && <p style={styles.hint}>Searching...</p>}
          {!searching && query && results.length === 0 && (
            <p style={styles.hint}>No organizations found</p>
          )}
          {results.map((org) => (
            <div key={org.id} style={styles.resultItem}>
              <div style={styles.orgIcon}>🏢</div>
              <div style={styles.orgInfo}>
                <div style={styles.orgName}>{org.name}</div>
                <div style={styles.orgMeta}>{org.memberCount} members{org.description ? ` · ${org.description}` : ''}</div>
              </div>
              {requestSent[org.id] ? (
                <span style={styles.sentBadge}>Request Sent</span>
              ) : (
                <button style={styles.joinBtn} onClick={() => handleRequestJoin(org.id)}>
                  Request to Join
                </button>
              )}
            </div>
          ))}
          {!query && !searching && results.length > 0 && (
            <p style={{ ...styles.hint, marginBottom: 4 }}>Popular organizations</p>
          )}
          {!query && !searching && results.length === 0 && (
            <p style={styles.hint}>No organizations available yet</p>
          )}
        </div>

        <div style={styles.footer}>
          <span style={styles.footerText}>Don't see yours?</span>
          <Link to="/create-organization" style={styles.link}>Create a new organization</Link>
          <span style={styles.footerDivider}>·</span>
          <Link to="/chats" style={styles.link}>Skip for now</Link>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-secondary)', padding: 16 },
  card: { background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', padding: 32, width: '100%', maxWidth: 500, boxShadow: 'var(--shadow-lg)' },
  title: { fontSize: 22, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 4px', textAlign: 'center' },
  subtitle: { fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 20, textAlign: 'center' },
  error: { background: '#FEE2E2', color: '#DC2626', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: 13, marginBottom: 12 },
  input: { width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const, color: 'var(--color-text)', background: 'var(--color-bg-secondary)', marginBottom: 12 },
  resultsList: { minHeight: 120, maxHeight: 300, overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: 4, marginBottom: 16 },
  resultItem: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 'var(--radius-sm)' },
  orgIcon: { fontSize: 28, flexShrink: 0 },
  orgInfo: { flex: 1 },
  orgName: { fontSize: 15, fontWeight: 600, color: 'var(--color-text)' },
  orgMeta: { fontSize: 12, color: 'var(--color-text-secondary)' },
  joinBtn: { padding: '6px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-primary)', background: 'transparent', color: 'var(--color-primary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  sentBadge: { padding: '6px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' },
  hint: { fontSize: 13, color: 'var(--color-text-tertiary)', textAlign: 'center', margin: '20px 8px' },
  footer: { textAlign: 'center', fontSize: 14 },
  footerText: { color: 'var(--color-text-secondary)', marginRight: 6 },
  link: { color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 500 },
  footerDivider: { margin: '0 8px', color: 'var(--color-text-tertiary)' },
};
