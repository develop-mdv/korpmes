import { useEffect, useState } from 'react';
import * as orgsApi from '@/api/organizations.api';
import { EmptyState } from '@/components/common/EmptyState';
import { useOrganizationStore } from '@/stores/organization.store';

export function MembersPage() {
  const currentOrg = useOrganizationStore((state) => state.currentOrg);
  const organizations = useOrganizationStore((state) => state.organizations);
  const members = useOrganizationStore((state) => state.members);
  const setMembers = useOrganizationStore((state) => state.setMembers);
  const setCurrentOrg = useOrganizationStore((state) => state.setCurrentOrg);
  const setOrganizations = useOrganizationStore((state) => state.setOrganizations);
  const removeMemberFromStore = useOrganizationStore((state) => state.removeMember);
  const updateMemberRole = useOrganizationStore((state) => state.updateMemberRole);

  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [inviting, setInviting] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentOrg) {
      setLoading(false);
      return;
    }

    setLoading(true);
    orgsApi
      .getMembers(currentOrg.id)
      .then((response) => {
        setMembers(response.members);
      })
      .catch(() => {
        setError('Не удалось загрузить список участников.');
      })
      .finally(() => setLoading(false));
  }, [currentOrg, setMembers]);

  const syncMemberCount = (delta: number) => {
    if (!currentOrg) {
      return;
    }

    const nextOrganization = {
      ...currentOrg,
      memberCount: Math.max(0, currentOrg.memberCount + delta),
    };

    setCurrentOrg(nextOrganization);
    setOrganizations(organizations.map((item) => (item.id === currentOrg.id ? nextOrganization : item)));
  };

  const handleInvite = async () => {
    if (!currentOrg || !inviteEmail.trim()) {
      return;
    }

    setInviting(true);
    setMessage(null);
    setError(null);

    try {
      await orgsApi.inviteMember(currentOrg.id, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setInviteEmail('');
      setInviteRole('member');
      setMessage('Приглашение отправлено. После принятия новый участник появится в списке.');
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : 'Не удалось отправить приглашение.');
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (userId: string, role: 'admin' | 'member') => {
    if (!currentOrg) {
      return;
    }

    setBusyUserId(userId);
    setMessage(null);
    setError(null);

    try {
      await orgsApi.changeRole(currentOrg.id, userId, role);
      updateMemberRole(userId, role);
      setMessage('Роль участника обновлена.');
    } catch (roleError) {
      setError(roleError instanceof Error ? roleError.message : 'Не удалось изменить роль.');
    } finally {
      setBusyUserId(null);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!currentOrg || !window.confirm('Удалить участника из организации?')) {
      return;
    }

    setBusyUserId(userId);
    setMessage(null);
    setError(null);

    try {
      await orgsApi.removeMember(currentOrg.id, userId);
      removeMemberFromStore(userId);
      syncMemberCount(-1);
      setMessage('Участник удалён из пространства.');
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Не удалось удалить участника.');
    } finally {
      setBusyUserId(null);
    }
  };

  if (!currentOrg) {
    return (
      <div className="page-shell">
        <div className="page-shell__inner">
          <section className="lux-panel" style={{ minHeight: 340 }}>
            <EmptyState title="Нет активной организации" description="Сначала выберите рабочее пространство, чтобы управлять его участниками." />
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
            <div className="page-hero__kicker">Участники</div>
            <h1 className="page-hero__title">Команда {currentOrg.name}</h1>
            <p className="page-hero__description">
              Управляйте доступом, ролями и составом пространства из одной светлой панели без лишней административной
              тяжести.
            </p>
            <div className="page-hero__meta">
              <span className="lux-pill">{members.length} в текущем списке</span>
              <span className="lux-pill">{currentOrg.memberCount} всего в организации</span>
            </div>
          </div>
        </section>

        <div className="page-grid page-grid--two">
          <section className="lux-panel stat-card">
            <div className="auth-shell__form-copy" style={{ marginBottom: 20 }}>
              <div className="auth-shell__form-title">Приглашение</div>
              <div className="auth-shell__form-subtitle">Добавьте нового участника в пространство</div>
            </div>

            <div className="inline-form">
              <div className="field-group">
                <label className="field-group__label" htmlFor="invite-email">
                  Email
                </label>
                <input
                  id="invite-email"
                  className="lux-input"
                  type="email"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="teammate@company.com"
                />
              </div>

              <div className="field-group">
                <label className="field-group__label" htmlFor="invite-role">
                  Роль
                </label>
                <select
                  id="invite-role"
                  className="lux-select"
                  value={inviteRole}
                  onChange={(event) => setInviteRole(event.target.value as 'admin' | 'member')}
                >
                  <option value="member">Участник</option>
                  <option value="admin">Администратор</option>
                </select>
              </div>

              {message && (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 18,
                    background: 'rgba(30, 157, 104, 0.1)',
                    border: '1px solid rgba(30, 157, 104, 0.18)',
                    color: 'var(--color-success)',
                    fontSize: 14,
                  }}
                >
                  {message}
                </div>
              )}

              {error && (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 18,
                    background: 'rgba(212, 98, 98, 0.1)',
                    border: '1px solid rgba(212, 98, 98, 0.18)',
                    color: 'var(--color-error)',
                    fontSize: 14,
                  }}
                >
                  {error}
                </div>
              )}

              <div className="form-actions">
                <button className="lux-button" type="button" onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
                  {inviting ? 'Отправляем...' : 'Пригласить'}
                </button>
              </div>
            </div>
          </section>

          <section className="lux-panel stat-card">
            <div className="auth-shell__form-copy" style={{ marginBottom: 20 }}>
              <div className="auth-shell__form-title">Состав команды</div>
              <div className="auth-shell__form-subtitle">Роли, контакты и быстрые действия</div>
            </div>

            {loading ? (
              <div style={{ padding: '6px 0', color: 'var(--color-text-secondary)' }}>Загружаем участников...</div>
            ) : members.length === 0 ? (
              <EmptyState title="Пока никого нет" description="Пригласите первого участника, чтобы открыть совместную работу." />
            ) : (
              <div className="collection-list">
                {members.map((member) => (
                  <article key={member.userId} className="list-card" style={{ alignItems: 'flex-start' }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        display: 'grid',
                        placeItems: 'center',
                        background: 'linear-gradient(135deg, var(--color-primary-light), var(--color-primary))',
                        color: '#1c1309',
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      {`${member.firstName[0] || ''}${member.lastName[0] || ''}`.trim() || 'U'}
                    </div>

                    <div className="list-card__body">
                      <div className="list-card__title">
                        {member.firstName} {member.lastName}
                      </div>
                      <div className="list-card__subtitle" style={{ marginTop: 6 }}>
                        {member.email}
                      </div>
                      <div className="list-card__meta">
                        <span>Роль: {member.role === 'owner' ? 'Владелец' : member.role === 'admin' ? 'Администратор' : 'Участник'}</span>
                        <span>{member.department ? `Отдел: ${member.department}` : 'Без отдела'}</span>
                        <span>С нами с {new Date(member.joinedAt).toLocaleDateString('ru-RU')}</span>
                      </div>
                    </div>

                    <div className="list-card__actions" style={{ alignItems: 'stretch', flexDirection: 'column' }}>
                      {member.role === 'owner' ? (
                        <span className="lux-pill">Владелец</span>
                      ) : (
                        <>
                          <select
                            className="lux-select"
                            value={member.role}
                            onChange={(event) => handleRoleChange(member.userId, event.target.value as 'admin' | 'member')}
                            disabled={busyUserId === member.userId}
                          >
                            <option value="member">Участник</option>
                            <option value="admin">Администратор</option>
                          </select>
                          <button
                            className="lux-button-danger"
                            type="button"
                            onClick={() => handleRemove(member.userId)}
                            disabled={busyUserId === member.userId}
                          >
                            Удалить
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
