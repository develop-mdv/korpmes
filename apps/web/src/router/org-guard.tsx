import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useOrganizationStore } from '@/stores/organization.store';
import * as orgsApi from '@/api/organizations.api';

export function OrgGuard() {
  const { currentOrg, setOrganizations, setCurrentOrg } = useOrganizationStore();
  const [loading, setLoading] = useState(!currentOrg);

  useEffect(() => {
    if (currentOrg) {
      setLoading(false);
      return;
    }

    orgsApi.getOrganizations().then((orgs) => {
      if (orgs.length > 0) {
        setOrganizations(orgs);
        setCurrentOrg(orgs[0]);
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [currentOrg, setOrganizations, setCurrentOrg]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--color-text-secondary)' }}>
        Loading...
      </div>
    );
  }

  return <Outlet />;
}
