import React from 'react';
import { Link } from 'react-router-dom';
import { useOrganizationStore } from '@/stores/organization.store';

export function OrganizationPage() {
  const { currentOrg, members } = useOrganizationStore();

  if (!currentOrg) {
    return (
      <div style={styles.container}>
        <p style={styles.empty}>No organization selected</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.orgAvatar}>{currentOrg.name.charAt(0)}</div>
        <div>
          <h1 style={styles.title}>{currentOrg.name}</h1>
          {currentOrg.description && <p style={styles.description}>{currentOrg.description}</p>}
        </div>
      </div>

      <div style={styles.stats}>
        <div style={styles.statCard}>
          <span style={styles.statValue}>{members.length}</span>
          <span style={styles.statLabel}>Members</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statValue}>0</span>
          <span style={styles.statLabel}>Departments</span>
        </div>
      </div>

      <div style={styles.nav}>
        <Link to="/organization/members" style={styles.navLink}>
          <span style={styles.navTitle}>Members</span>
          <span style={styles.navArrow}>&rarr;</span>
        </Link>
        <Link to="/organization/departments" style={styles.navLink}>
          <span style={styles.navTitle}>Departments</span>
          <span style={styles.navArrow}>&rarr;</span>
        </Link>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: 24, maxWidth: 720, margin: '0 auto' },
  header: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 },
  orgAvatar: { width: 64, height: 64, borderRadius: 16, background: 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700 },
  title: { fontSize: 28, fontWeight: 700, margin: 0, color: 'var(--color-text)' },
  description: { fontSize: 14, color: 'var(--color-text-secondary)', margin: '4px 0 0' },
  stats: { display: 'flex', gap: 16, marginBottom: 32 },
  statCard: { flex: 1, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 20, textAlign: 'center' },
  statValue: { display: 'block', fontSize: 32, fontWeight: 700, color: 'var(--color-primary)' },
  statLabel: { display: 'block', fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 },
  nav: { display: 'grid', gap: 8 },
  navLink: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', textDecoration: 'none', color: 'var(--color-text)' },
  navTitle: { fontSize: 16, fontWeight: 500 },
  navArrow: { fontSize: 18, color: 'var(--color-text-tertiary)' },
  empty: { color: 'var(--color-text-secondary)', textAlign: 'center', padding: 40 },
};
