import React, { useEffect, useState } from 'react';
import { Avatar } from '@/components/common/Avatar';
import { useOrganizationStore } from '@/stores/organization.store';
import * as orgsApi from '@/api/organizations.api';

export function RequestsPage() {
  const { currentOrg } = useOrganizationStore();
  const [requests, setRequests] = useState<orgsApi.JoinRequest[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!currentOrg) return;
    setLoading(true);
    orgsApi
      .listJoinRequests(currentOrg.id)
      .then((reqs) => {
        setRequests(reqs);
        setError('');
      })
      .catch((err) => {
        setError(err.response?.data?.error?.message || 'Не удалось загрузить заявки');
      })
      .finally(() => setLoading(false));
  }, [currentOrg]);

  const handleApprove = async (requestId: string) => {
    if (!currentOrg) return;
    setBusyId(requestId);
    try {
      await orgsApi.approveJoinRequest(currentOrg.id, requestId);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Не удалось одобрить заявку');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!currentOrg) return;
    setBusyId(requestId);
    try {
      await orgsApi.rejectJoinRequest(currentOrg.id, requestId);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Не удалось отклонить заявку');
    } finally {
      setBusyId(null);
    }
  };

  if (!currentOrg) {
    return (
      <div style={{ padding: 24, color: 'var(--color-text-secondary)' }}>
        Выберите организацию
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Заявки на вступление</h1>
      <p style={styles.subtitle}>
        Здесь видны запросы пользователей, которые хотят вступить в «{currentOrg.name}».
      </p>

      {error && <div style={styles.error}>{error}</div>}

      {loading ? (
        <div style={styles.empty}>Загрузка...</div>
      ) : requests.length === 0 ? (
        <div style={styles.empty}>Нет ожидающих заявок</div>
      ) : (
        <div style={styles.list}>
          {requests.map((r) => (
            <div key={r.id} style={styles.row}>
              <Avatar
                name={`${r.user?.firstName ?? ''} ${r.user?.lastName ?? ''}`}
                src={r.user?.avatarUrl}
                size="md"
              />
              <div style={styles.info}>
                <div style={styles.name}>
                  {r.user?.firstName} {r.user?.lastName}
                </div>
                <div style={styles.email}>{r.user?.email}</div>
                {r.message && <div style={styles.message}>«{r.message}»</div>}
                <div style={styles.date}>
                  {new Date(r.createdAt).toLocaleString()}
                </div>
              </div>
              <div style={styles.actions}>
                <button
                  style={styles.approveBtn}
                  onClick={() => handleApprove(r.id)}
                  disabled={busyId === r.id}
                >
                  Одобрить
                </button>
                <button
                  style={styles.rejectBtn}
                  onClick={() => handleReject(r.id)}
                  disabled={busyId === r.id}
                >
                  Отклонить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: 24, maxWidth: 800, margin: '0 auto' },
  title: { fontSize: 24, fontWeight: 700, margin: '0 0 4px' },
  subtitle: { fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 20 },
  error: { background: '#FEE2E2', color: '#DC2626', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: 13, marginBottom: 12 },
  empty: { textAlign: 'center', padding: 40, color: 'var(--color-text-tertiary)', fontSize: 14, border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)' },
  list: { display: 'flex', flexDirection: 'column', gap: 12 },
  row: { display: 'flex', alignItems: 'center', gap: 16, padding: 16, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: 600, color: 'var(--color-text)' },
  email: { fontSize: 13, color: 'var(--color-text-secondary)' },
  message: { fontSize: 13, color: 'var(--color-text)', marginTop: 6, fontStyle: 'italic' },
  date: { fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 4 },
  actions: { display: 'flex', gap: 8, flexShrink: 0 },
  approveBtn: { padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--color-primary)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  rejectBtn: { padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid #EF4444', background: 'transparent', color: '#EF4444', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
};
