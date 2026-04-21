import { useEffect } from 'react';
import * as organizationsApi from '../api/organizations.api';
import { useAuthStore } from '../stores/auth.store';
import { useOrganizationStore } from '../stores/organization.store';

export function useOrganizationBootstrap() {
  const userId = useAuthStore((state) => state.user?.id);
  const setOrganizations = useOrganizationStore((state) => state.setOrganizations);
  const setCurrentOrg = useOrganizationStore((state) => state.setCurrentOrg);
  const setLoading = useOrganizationStore((state) => state.setLoading);
  const reset = useOrganizationStore((state) => state.reset);

  useEffect(() => {
    let isActive = true;

    if (!userId) {
      reset();
      return;
    }

    const bootstrapOrganizations = async () => {
      try {
        setLoading(true);
        const organizations = await organizationsApi.getOrganizations();

        if (!isActive) {
          return;
        }

        setOrganizations(organizations);
        setCurrentOrg(organizations[0] ?? null);
      } catch (error) {
        if (isActive) {
          console.error('Failed to load organizations:', error);
          reset();
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void bootstrapOrganizations();

    return () => {
      isActive = false;
    };
  }, [reset, setCurrentOrg, setLoading, setOrganizations, userId]);
}
