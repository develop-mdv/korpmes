import { useEffect, useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { useOrganizationStore } from '@/stores/organization.store';
import { useAuthStore } from '@/stores/auth.store';
import * as orgsApi from '@/api/organizations.api';

// Bootstrap is shared by both personal and organization spaces.
export function OrgGuard() {
  const userId = useAuthStore((state) => state.user?.id);
  const { currentOrg, initializedUserId, initialize, setMembers, reset } = useOrganizationStore();
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    if (!userId) return;
    if (initializedUserId === userId) return;
    reset();
    setError(false);
    orgsApi.getOrganizations().then((orgs) => {
      if (active) initialize(userId, orgs);
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [userId, initializedUserId, initialize, reset, attempt]);

  useEffect(() => {
    let active = true;
    setMembers([]);
    if (currentOrg) {
      orgsApi.getMembers(currentOrg.id).then((res) => {
        if (active) setMembers(res.members ?? []);
      }).catch(() => { if (active) setMembers([]); });
    }
    return () => { active = false; };
  }, [currentOrg?.id, setMembers]);

  if (initializedUserId !== userId) {
    return <div className="page-shell" style={{ padding: 32 }}>
      {error ? <div role="alert">Не удалось загрузить пространства. <button className="lux-button" onClick={() => setAttempt((value) => value + 1)}>Повторить</button></div> : 'Загрузка...'}
    </div>;
  }
  return <Outlet />;
}

export function OrganizationRequired() {
  const currentOrg = useOrganizationStore((state) => state.currentOrg);
  if (currentOrg) return <Outlet />;
  return <div className="page-shell"><section className="lux-panel" style={{ padding: 32 }}>
    <h1>Раздел организации</h1>
    <p>Выберите организацию в меню пространств. Личные чаты доступны сразу после регистрации.</p>
    <div className="form-actions">
      <Link className="lux-button" to="/chats">Личные чаты</Link>
      <Link className="lux-button-secondary" to="/create-organization">Создать организацию</Link>
      <Link className="lux-button-secondary" to="/join-organization">Присоединиться</Link>
    </div>
  </section></div>;
}
