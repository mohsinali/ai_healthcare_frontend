"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest, configureApiAuth, setApiAccessToken } from "@/lib/api/client";
import { AuthUser } from "./types";
type State = "checking" | "authenticated" | "unauthenticated" | "unavailable";
interface AuthContextValue { user: AuthUser | null; accessToken: string | null; status: State; isAuthenticated: boolean; isLoading: boolean; signIn(email: string, password: string): Promise<void>; signOut(): Promise<void>; refreshSession(): Promise<string | null>; }
const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient(); const [user, setUser] = useState<AuthUser | null>(null); const [accessToken, setToken] = useState<string | null>(null); const [status, setStatus] = useState<State>("checking");
  const updateToken = useCallback((token: string | null) => { setToken(token); setApiAccessToken(token); }, []);
  const clear = useCallback(async (next: State = "unauthenticated") => { updateToken(null); setUser(null); setStatus(next); await queryClient.cancelQueries(); queryClient.clear(); }, [queryClient, updateToken]);
  const refreshSession = useCallback(async () => { try { const result = await apiRequest<{ accessToken: string }>("/auth/refresh", { method: "POST" }, false); updateToken(result.accessToken); return result.accessToken; } catch { await clear(); return null; } }, [clear, updateToken]);
  useEffect(() => { configureApiAuth({ refresh: refreshSession }); void (async () => { const token = await refreshSession(); if (!token) return; try { setUser(await apiRequest<AuthUser>("/auth/me")); setStatus("authenticated"); } catch { await clear(); } })(); }, [clear, refreshSession]);
  const signIn = useCallback(async (email: string, password: string) => { const result = await apiRequest<{ accessToken: string; user: AuthUser }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }, false); updateToken(result.accessToken); setUser(result.user); setStatus("authenticated"); }, [updateToken]);
  const signOut = useCallback(async () => { try { await apiRequest("/auth/logout", { method: "POST" }, false); } finally { await clear(); } }, [clear]);
  const value = useMemo(() => ({ user, accessToken, status, isAuthenticated: status === "authenticated", isLoading: status === "checking", signIn, signOut, refreshSession }), [user, accessToken, status, signIn, signOut, refreshSession]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error("useAuth must be used within AuthProvider"); return value; }
