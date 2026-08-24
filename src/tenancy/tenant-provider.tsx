"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { TenantMembership } from "@/auth/types";
import { useAuth } from "@/auth/auth-provider";
const STORAGE_KEY = "aiva.currentTenantId";
export function resolveTenantSelection(memberships: TenantMembership[], stored: string | null) { if (stored && memberships.some((item) => item.tenant.id === stored)) return stored; return memberships.length === 1 ? memberships[0].tenant.id : null; }
interface Value { currentMembership: TenantMembership | null; currentTenant: TenantMembership["tenant"] | null; availableTenants: TenantMembership[]; tenantRole: TenantMembership["role"] | null; isTenantSelected: boolean; selectTenant(id: string): Promise<void>; }
const TenantContext = createContext<Value | null>(null);
export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth(); const queryClient = useQueryClient(); const memberships = useMemo(() => (user?.tenantMemberships ?? []).filter((item) => item.status === "ACTIVE" && item.tenant.status === "ACTIVE"), [user]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => { const stored = window.localStorage.getItem(STORAGE_KEY); const next = resolveTenantSelection(memberships, stored);
    // Membership refresh is authoritative; reconcile the convenience selection immediately.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedId(next); if (next) window.localStorage.setItem(STORAGE_KEY, next); else window.localStorage.removeItem(STORAGE_KEY); }, [memberships]);
  const selectTenant = useCallback(async (id: string) => { if (!memberships.some((item) => item.tenant.id === id)) return; await queryClient.cancelQueries({ predicate: (query) => query.meta?.tenantScoped === true }); queryClient.removeQueries({ predicate: (query) => query.meta?.tenantScoped === true }); setSelectedId(id); window.localStorage.setItem(STORAGE_KEY, id); }, [memberships, queryClient]);
  const currentMembership = memberships.find((item) => item.tenant.id === selectedId) ?? null;
  const value = useMemo(() => ({ currentMembership, currentTenant: currentMembership?.tenant ?? null, availableTenants: memberships, tenantRole: currentMembership?.role ?? null, isTenantSelected: Boolean(currentMembership), selectTenant }), [currentMembership, memberships, selectTenant]);
  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}
export function useTenant() { const value = useContext(TenantContext); if (!value) throw new Error("useTenant must be used within TenantProvider"); return value; }
