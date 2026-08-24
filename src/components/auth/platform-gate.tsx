"use client";
import { useAuth } from "@/auth/auth-provider";
import { ShieldX } from "lucide-react";
export function PlatformGate({ children }: { children: React.ReactNode }) { const { user } = useAuth(); if (user?.platformRole === "SUPER_ADMIN") return children; return <div className="flex min-h-[65vh] items-center justify-center text-center"><div><ShieldX className="mx-auto size-10 text-destructive"/><h1 className="mt-4 text-2xl font-semibold">Access Denied</h1><p className="mt-2 text-muted-foreground">You do not have permission to manage platform tenants.</p></div></div>; }
