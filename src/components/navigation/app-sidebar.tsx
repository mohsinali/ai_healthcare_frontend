"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  AudioWaveform,
  BookOpen,
  Building2,
  CalendarDays,
  CircleHelp,
  ClipboardList,
  FileClock,
  LayoutDashboard,
  MapPin,
  Phone,
  Plug,
  Settings,
  ShieldAlert,
  Stethoscope,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import { useAuth } from "@/auth/auth-provider";
import { tenantRoleLabel } from "@/auth/types";
import { useTenant } from "@/tenancy/tenant-provider";
import { cn } from "@/lib/utils";
const clinicGroups = [
  {
    label: "",
    items: [{ label: "Overview", href: "/", icon: LayoutDashboard }],
  },
  {
    label: "Operations",
    items: [
      { label: "Appointments", href: "#", icon: CalendarDays },
      { label: "Patients", href: "/patients", icon: Users },
      { label: "Calls", href: "#", icon: Phone },
    ],
  },
  {
    label: "Clinic",
    items: [
      { label: "Providers", href: "/providers", icon: Stethoscope },
      { label: "Services", href: "/services", icon: ClipboardList },
      { label: "Locations", href: "/locations", icon: MapPin },
    ],
  },
  {
    label: "AI Front Desk",
    items: [
      { label: "Voice Agent", href: "#", icon: AudioWaveform },
      { label: "Knowledge Base", href: "#", icon: BookOpen },
      { label: "Escalation Rules", href: "#", icon: ShieldAlert },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Team", href: "#", icon: UsersRound },
      { label: "Integrations", href: "#", icon: Plug },
      { label: "Audit Log", href: "#", icon: FileClock },
      { label: "Settings", href: "#", icon: Settings },
    ],
  },
];
const platformGroups = [
  {
    label: "",
    items: [
      { label: "Overview", href: "/", icon: LayoutDashboard },
      { label: "Tenants", href: "/tenants", icon: Building2 },
    ],
  },
];
export function AppSidebar({
  collapsed,
  mobileOpen,
  onCloseMobile,
}: {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const { user } = useAuth();
  const tenant = useTenant();
  const pathname = usePathname();
  const groups =
    user?.platformRole === "SUPER_ADMIN" ? platformGroups : clinicGroups;
  return (
    <>
      <button
        className={cn(
          "fixed inset-0 z-40 bg-slate-950/50 lg:hidden",
          mobileOpen ? "block" : "hidden",
        )}
        onClick={onCloseMobile}
        aria-label="Close navigation overlay"
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-sidebar text-sidebar-foreground transition-transform lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed && "lg:w-[76px]",
        )}
        aria-label="Main navigation"
      >
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/95 text-sidebar">
            <Activity className="size-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                Aiva Health
              </p>
              <p className="truncate text-[11px] text-teal-100/70">
                Front Desk Intelligence
              </p>
            </div>
          )}
          <button
            className="ml-auto rounded-md p-2 hover:bg-sidebar-accent lg:hidden"
            onClick={onCloseMobile}
            aria-label="Close navigation"
          >
            <X className="size-4" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {groups.map((group) => (
            <div className="mb-4" key={group.label || "main"}>
              {group.label && !collapsed && (
                <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-teal-100/55">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map(({ label, href, icon: Icon }) => (
                  <Link
                    key={label}
                    href={href}
                    title={collapsed ? label : undefined}
                    onClick={onCloseMobile}
                    className={cn(
                      "flex h-9 items-center gap-3 rounded-md px-2.5 text-sm text-teal-50/80 transition-colors hover:bg-sidebar-accent hover:text-white",
                      href !== "#" &&
                        (pathname === href ||
                          (href !== "/" && pathname.startsWith(href))) &&
                        "bg-sidebar-accent text-white",
                    )}
                  >
                    <Icon className="size-[18px] shrink-0" strokeWidth={1.8} />
                    {!collapsed && <span>{label}</span>}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3">
          {user?.platformRole !== "SUPER_ADMIN" &&
            (!collapsed ? (
              <>
                <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-teal-100/55">
                  Current Clinic
                </p>
                {tenant.availableTenants.length > 1 ? (
                  <select
                    aria-label="Current Clinic"
                    value={tenant.currentTenant?.id ?? ""}
                    onChange={(event) =>
                      void tenant.selectTenant(event.target.value)
                    }
                    className="mt-2 w-full rounded-md border-white/15 bg-black/10 p-2 text-xs text-white"
                  >
                    <option value="" className="text-slate-900">
                      Choose a clinic
                    </option>
                    {tenant.availableTenants.map((item) => (
                      <option
                        className="text-slate-900"
                        value={item.tenant.id}
                        key={item.id}
                      >
                        {item.tenant.name} — {tenantRoleLabel(item.role)}
                      </option>
                    ))}
                  </select>
                ) : tenant.currentMembership ? (
                  <div className="mt-2 flex items-center gap-3 rounded-md bg-black/10 p-2.5">
                    <Building2 className="size-4 shrink-0" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-white">
                        {tenant.currentTenant?.name}
                      </p>
                      <p className="text-[11px] text-teal-100/65">
                        {tenantRoleLabel(tenant.currentMembership.role)}
                      </p>
                    </div>
                  </div>
                ) : null}
                <Link
                  href="#"
                  className="mt-2 flex items-center gap-2 rounded-md px-2.5 py-2 text-xs text-teal-50/70 hover:bg-sidebar-accent"
                >
                  <CircleHelp className="size-4" />
                  Help &amp; Support
                </Link>
              </>
            ) : (
              <Building2 className="mx-auto size-5" />
            ))}
        </div>
      </aside>
    </>
  );
}
