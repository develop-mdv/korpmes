import { useEffect, useState } from 'react';
import { Avatar } from '@/components/common/Avatar';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
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
    setError('');
    orgsApi
      .listJoinRequests(currentOrg.id)
      .then((reqs) => setRequests(reqs))
      .catch((err) => {
        setError(err.response?.data?.error?.message || 'Не удалось загрузить заявки');
      })
      .finally(() => setLoading(false));
  }, [currentOrg]);

  const handleApprove = async (requestId: string) => {
    if (!currentOrg) return;
    setBusyId(requestId);
    setError('');
    try {
      await orgsApi.approveJoinRequest(currentOrg.id, requestId);
      setRequests((prev) => prev.filter((request) => request.id !== requestId));
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Не удалось одобрить заявку');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!currentOrg) return;
    setBusyId(requestId);
    setError('');
    try {
      await orgsApi.rejectJoinRequest(currentOrg.id, requestId);
      setRequests((prev) => prev.filter((request) => request.id !== requestId));
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
              <h1 className="page-hero__title">Выберите организацию.</h1>
              <p className="page-hero__description">
                Чтобы просматривать запросы на вступление, переключитесь на нужное рабочее пространство.
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
            <h1 className="page-hero__title">Заявки на вступление.</h1>
            <p className="page-hero__description">
              Здесь собраны пользователи, которые хотят попасть в «{currentOrg.name}». Одобрение сразу добавит человека в пространство.
            </p>
            <div className="page-hero__meta">
              <span className="lux-pill">Ожидают: {requests.length}</span>
            </div>
          </div>
        </section>

        {error && <div className="lux-alert">{error}</div>}

        <section className="lux-panel" style={{ padding: 16 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
              <LoadingSpinner />
            </div>
          ) : requests.length === 0 ? (
            <EmptyState
              title="Нет ожидающих заявок"
              description="Когда кто-то попросит доступ, заявка появится здесь."
            />
          ) : (
            <div className="collection-list">
              {requests.map((request) => {
                const name = [request.user?.firstName, request.user?.lastName].filter(Boolean).join(' ');

                return (
                  <article key={request.id} className="list-card">
                    <Avatar name={name || request.user?.email || 'Пользователь'} src={request.user?.avatarUrl} size="md" />
                    <div className="list-card__body">
                      <div className="list-card__title">{name || 'Пользователь'}</div>
                      <div className="list-card__subtitle">{request.user?.email}</div>
                      {request.message && (
                        <div className="list-card__subtitle" style={{ marginTop: 6, fontStyle: 'italic' }}>
                          «{request.message}»
                        </div>
                      )}
                      <div className="list-card__meta">
                        <span>{new Date(request.createdAt).toLocaleString('ru-RU')}</span>
                      </div>
                    </div>
                    <div className="list-card__actions">
                      <button
                        className="lux-button"
                        onClick={() => handleApprove(request.id)}
                        disabled={busyId === request.id}
                        type="button"
                      >
                        Одобрить
                      </button>
                      <button
                        className="lux-button-danger"
                        onClick={() => handleReject(request.id)}
                        disabled={busyId === request.id}
                        type="button"
                      >
                        Отклонить
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
