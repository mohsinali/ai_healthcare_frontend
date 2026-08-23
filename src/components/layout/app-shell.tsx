"use client";
import { useState } from "react";
import { AppSidebar } from "@/components/navigation/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { AuthGate } from "@/components/auth/auth-gate";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false); const [mobileOpen, setMobileOpen] = useState(false);
  return <AuthGate><div className="min-h-screen"><AppSidebar collapsed={collapsed} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} /><div className={collapsed ? "lg:pl-[76px]" : "lg:pl-60"}><AppHeader collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} onOpenMobile={() => setMobileOpen(true)} /><main className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">{children}</main></div></div></AuthGate>;
}
