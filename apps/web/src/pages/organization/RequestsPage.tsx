import { useEffect, useState } from 'react';
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
      <div className="page-shell">
        <div className="page-shell__inner">
          <section className="lux-panel page-hero">
            <div className="page-hero__copy">
              <div className="page-hero__kicker">Заявки</div>
              <h1 className="page-hero__title">Выберите организацию</h1>
              <p className="page-hero__description">
                Чтобы просматривать заявки на вступление, переключитесь на нужное рабочее пространство.
              </p>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="page-shell__inner">
        <section className="lux-panel page-hero">
          <div className="page-hero__copy">
            <div className="page-hero__kicker">Доступ</div>
            <h1 className="page-hero__title">Заявки на вступление</h1>
            <p className="page-hero__description">
              Здесь видны запросы пользователей, которые хотят вступить в «{currentOrg.name}».
            </p>
          </div>
        </section>

        {error && <div className="lux-alert">{error}</div>}

        <section className="lux-panel" style={{ marginTop: 18 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-secondary)' }}>Загрузка…</div>
          ) : requests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-tertiary)' }}>Нет ожидающих заявок</div>
          ) : (
            <div className="collection-list">
              {requests.map((r) => (
                <article key={r.id} className="list-card">
                  <Avatar
                    name={`${r.user?.firstName ?? ''} ${r.user?.lastName ?? ''}`}
                    src={r.user?.avatarUrl}
                    size="md"
                  />
                  <div className="list-card__body">
                    <div className="list-card__title">
                      {r.user?.firstName} {r.user?.lastName}
                    </div>
                    <div className="list-card__subtitle">{r.user?.email}</div>
                    {r.message && (
                      <div className="list-card__subtitle" style={{ marginTop: 6, fontStyle: 'italic' }}>
                        «{r.message}»
                      </div>
                    )}
                    <div className="list-card__subtitle" style={{ marginTop: 4 }}>
                      {new Date(r.createdAt).toLocaleString('ru-RU')}
                    </div>
                  </div>
                  <div className="list-card__actions">
                    <button
                      className="lux-button"
                      onClick={() => handleApprove(r.id)}
                      disabled={busyId === r.id}
                    >
                      Одобрить
                    </button>
                    <button
                      className="lux-button-danger"
                      onClick={() => handleReject(r.id)}
                      disabled={busyId === r.id}
                    >
                      Отклонить
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
