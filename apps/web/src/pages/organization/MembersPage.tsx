import { useEffect, useMemo, useState } from 'react';
import { Avatar } from '@/components/common/Avatar';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { LuxSelect } from '@/components/common/LuxSelect';
import * as orgsApi from '@/api/organizations.api';
import { useOrganizationStore } from '@/stores/organization.store';
import type { OrganizationMember } from '@/stores/organization.store';

function roleLabel(role: OrganizationMember['role']) {
  if (role === 'owner') return 'Владелец';
  if (role === 'admin') return 'Администратор';
  return 'Участник';
}

function normalizeMembersResponse(response: unknown): OrganizationMember[] {
  if (Array.isArray(response)) return response as OrganizationMember[];

  const maybeResponse = response as { members?: unknown };
  if (Array.isArray(maybeResponse?.members)) {
    return maybeResponse.members as OrganizationMember[];
  }

  return [];
}

export function MembersPage() {
  const currentOrg = useOrganizationStore((state) => state.currentOrg);
  const organizations = useOrganizationStore((state) => state.organizations);
  const rawMembers = useOrganizationStore((state) => state.members);
  const setMembers = useOrganizationStore((state) => state.setMembers);
  const setCurrentOrg = useOrganizationStore((state) => state.setCurrentOrg);
  const setOrganizations = useOrganizationStore((state) => state.setOrganizations);
  const removeMemberFromStore = useOrganizationStore((state) => state.removeMember);
  const updateMemberRole = useOrganizationStore((state) => state.updateMemberRole);

  const members = Array.isArray(rawMembers) ? rawMembers : [];
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
    setError(null);
    orgsApi
      .getMembers(currentOrg.id)
      .then((response) => setMembers(normalizeMembersResponse(response)))
      .catch(() => {
        setMembers([]);
        setError('Не удалось загрузить список участников.');
      })
      .finally(() => setLoading(false));
  }, [currentOrg, setMembers]);

  const stats = useMemo(() => {
    const admins = members.filter((member) => member.role === 'admin' || member.role === 'owner').length;
    return {
      admins,
      regular: Math.max(0, members.length - admins),
    };
  }, [members]);

  const syncMemberCount = (delta: number) => {
    if (!currentOrg) return;

    const nextOrganization = {
      ...currentOrg,
      memberCount: Math.max(0, currentOrg.memberCount + delta),
    };

    setCurrentOrg(nextOrganization);
    setOrganizations(organizations.map((item) => (item.id === currentOrg.id ? nextOrganization : item)));
  };

  const handleInvite = async () => {
    if (!currentOrg || !inviteEmail.trim()) return;

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
      setMessage('Приглашение отправлено. Новый участник появится в списке после принятия.');
    } catch {
      setError('Не удалось отправить приглашение.');
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (userId: string, role: 'admin' | 'member') => {
    if (!currentOrg) return;

    setBusyUserId(userId);
    setMessage(null);
    setError(null);

    try {
      await orgsApi.changeRole(currentOrg.id, userId, role);
      updateMemberRole(userId, role);
      setMessage('Роль участника обновлена.');
    } catch {
      setError('Не удалось изменить роль.');
    } finally {
      setBusyUserId(null);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!currentOrg || !window.confirm('Удалить участника из организации?')) return;

    setBusyUserId(userId);
    setMessage(null);
    setError(null);

    try {
      await orgsApi.removeMember(currentOrg.id, userId);
      removeMemberFromStore(userId);
      syncMemberCount(-1);
      setMessage('Участник удалён из пространства.');
    } catch {
      setError('Не удалось удалить участника.');
    } finally {
      setBusyUserId(null);
    }
  };

  if (!currentOrg) {
    return (
      <div className="page-shell">
        <div className="page-shell__inner">
          <section className="lux-panel" style={{ minHeight: 340 }}>
            <EmptyState
              title="Нет активной организации"
              description="Сначала выберите рабочее пространство, чтобы управлять участниками."
            />
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
              Управляйте доступом, ролями и составом пространства из одной спокойной панели.
            </p>
            <div className="page-hero__meta">
              <span className="lux-pill">{members.length} в списке</span>
              <span className="lux-pill">{currentOrg.memberCount} всего</span>
              <span className="lux-pill">{stats.admins} администраторов</span>
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
                <LuxSelect<'admin' | 'member'>
                  id="invite-role"
                  value={inviteRole}
                  onChange={setInviteRole}
                  options={[
                    { value: 'member', label: 'Участник' },
                    { value: 'admin', label: 'Администратор' },
                  ]}
                />
              </div>

              {message && <div className="lux-alert lux-alert--success">{message}</div>}
              {error && <div className="lux-alert">{error}</div>}

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
              <div className="auth-shell__form-subtitle">
                {stats.regular} участников и {stats.admins} с расширенными правами
              </div>
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                <LoadingSpinner />
              </div>
            ) : members.length === 0 ? (
              <EmptyState
                title="Пока никого нет"
                description="Пригласите первого участника, чтобы открыть совместную работу."
              />
            ) : (
              <div className="collection-list">
                {members.map((member) => {
                  const name = `${member.firstName} ${member.lastName}`.trim() || member.email;

                  return (
                    <article key={member.userId} className="list-card" style={{ alignItems: 'flex-start' }}>
                      <Avatar name={name} src={member.avatar} size="md" />
                      <div className="list-card__body">
                        <div className="list-card__title">{name}</div>
                        <div className="list-card__subtitle" style={{ marginTop: 6 }}>
                          {member.email}
                        </div>
                        <div className="list-card__meta">
                          <span>Роль: {roleLabel(member.role)}</span>
                          <span>{member.department ? `Отдел: ${member.department}` : 'Без отдела'}</span>
                          <span>С нами с {new Date(member.joinedAt).toLocaleDateString('ru-RU')}</span>
                        </div>
                      </div>

                      <div className="list-card__actions" style={{ alignItems: 'stretch', flexDirection: 'column' }}>
                        {member.role === 'owner' ? (
                          <span className="lux-pill">Владелец</span>
                        ) : (
                          <>
                            <LuxSelect<'admin' | 'member'>
                              value={member.role === 'admin' ? 'admin' : 'member'}
                              onChange={(role) => handleRoleChange(member.userId, role)}
                              disabled={busyUserId === member.userId}
                              options={[
                                { value: 'member', label: 'Участник' },
                                { value: 'admin', label: 'Администратор' },
                              ]}
                            />
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
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
