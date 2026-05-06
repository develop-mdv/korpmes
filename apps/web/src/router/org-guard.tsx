import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useOrganizationStore } from '@/stores/organization.store';
import * as orgsApi from '@/api/organizations.api';

export function OrgGuard() {
  const { currentOrg, setOrganizations, setCurrentOrg, setMembers } = useOrganizationStore();
  const [loading, setLoading] = useState(!currentOrg);

  useEffect(() => {
    let active = true;

    const loadMembersFor = (orgId: string) => {
      orgsApi
        .getMembers(orgId)
        .then((res) => {
          if (active) setMembers(res.members ?? []);
        })
        .catch(() => {
          if (active) setMembers([]);
        });
    };

    if (currentOrg) {
      loadMembersFor(currentOrg.id);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    orgsApi
      .getOrganizations()
      .then((orgs) => {
        if (!active) return;
        if (orgs.length > 0) {
          setOrganizations(orgs);
          setCurrentOrg(orgs[0]);
          loadMembersFor(orgs[0].id);
        }
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [currentOrg, setOrganizations, setCurrentOrg, setMembers]);

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          color: 'var(--color-text-secondary)',
        }}
      >
        Загрузка...
      </div>
    );
  }

  return <Outlet />;
}
