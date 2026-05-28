import { useEffect } from 'react';
import * as organizationsApi from '../api/organizations.api';
import { useAuthStore } from '../stores/auth.store';
import { useOrganizationStore } from '../stores/organization.store';

export function useOrganizationBootstrap() {
  const userId = useAuthStore((state) => state.user?.id);
  const currentOrgId = useOrganizationStore((state) => state.currentOrg?.id);
  const setOrganizations = useOrganizationStore((state) => state.setOrganizations);
  const setCurrentOrg = useOrganizationStore((state) => state.setCurrentOrg);
  const setMembers = useOrganizationStore((state) => state.setMembers);
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

  useEffect(() => {
    let isActive = true;

    if (!currentOrgId) {
      setMembers([]);
      return;
    }

    const loadMembers = async () => {
      try {
        const response = await organizationsApi.getMembers(currentOrgId, 1, 100);
        if (isActive) {
          setMembers(response.members ?? []);
        }
      } catch (error) {
        if (isActive) {
          console.error('Failed to load organization members:', error);
          setMembers([]);
        }
      }
    };

    void loadMembers();

    return () => {
      isActive = false;
    };
  }, [currentOrgId, setMembers]);
}
