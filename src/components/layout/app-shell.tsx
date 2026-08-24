"use client";
import { useState } from "react";
import { AppSidebar } from "@/components/navigation/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { AuthGate } from "@/components/auth/auth-gate";
import { useAuth } from "@/auth/auth-provider";
import { useTenant } from "@/tenancy/tenant-provider";
import { Building2 } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth(); const tenant = useTenant();
  const [collapsed, setCollapsed] = useState(false); const [mobileOpen, setMobileOpen] = useState(false);
  const noClinic = user?.platformRole !== "SUPER_ADMIN" && !tenant.isTenantSelected;
  return <AuthGate><div className="min-h-screen"><AppSidebar collapsed={collapsed} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} /><div className={collapsed ? "lg:pl-[76px]" : "lg:pl-60"}><AppHeader collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} onOpenMobile={() => setMobileOpen(true)} /><main className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">{noClinic ? <div className="flex min-h-[65vh] items-center justify-center text-center"><div><Building2 className="mx-auto size-10 text-muted-foreground"/><h1 className="mt-4 text-2xl font-semibold">No Clinic Access</h1><p className="mt-2 text-muted-foreground">Your account is not currently assigned to a clinic.<br/>Please contact your administrator.</p></div></div> : children}</main></div></div></AuthGate>;
}
