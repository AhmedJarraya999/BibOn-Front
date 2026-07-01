'use client';
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from './api';
import { isLoggedIn } from './auth';
import type { Organization } from '@/types';

interface OrgContextType {
  activeOrg: Organization | null;
  setActiveOrg: (org: Organization) => void;
  organizations: Organization[];
  isLoading: boolean;
}

const OrgContext = createContext<OrgContextType>({
  activeOrg: null,
  setActiveOrg: () => {},
  organizations: [],
  isLoading: false,
});

export function OrgProvider({ children }: { children: ReactNode }) {
  const [activeOrg, setActiveOrgState] = useState<Organization | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(isLoggedIn());
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => api.get('/organizations').then((r) => r.data),
    enabled: loggedIn,
  });

  const organizations: Organization[] = data?.data ?? data ?? [];

  useEffect(() => {
    if (organizations.length === 0) return;
    const stored = localStorage.getItem('activeOrgId');
    const found = stored ? organizations.find((o) => o.id === stored) : null;
    setActiveOrgState(found ?? organizations[0]);
  }, [organizations.length]);

  const setActiveOrg = (org: Organization) => {
    localStorage.setItem('activeOrgId', org.id);
    setActiveOrgState(org);
  };

  return (
    <OrgContext.Provider value={{ activeOrg, setActiveOrg, organizations, isLoading }}>
      {children}
    </OrgContext.Provider>
  );
}

export const useOrg = () => useContext(OrgContext);
