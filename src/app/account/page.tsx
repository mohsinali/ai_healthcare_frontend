"use client";
import { useAuth } from "@/auth/auth-provider";
import {
  platformRoleLabel,
  tenantRoleLabel,
} from "@/auth/types";
import { PageHeader } from "@/components/common/page-header";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTenant } from "@/tenancy/tenant-provider";

const label = (value: string) =>
  value.charAt(0) + value.slice(1).toLowerCase().replaceAll("_", " ");

export default function AccountPage() {
  const { user } = useAuth();
  const { currentTenant, tenantRole } = useTenant();
  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Account"
          description="View your account and current clinic access."
        />
        <Card>
          <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
          <CardContent className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
            <Detail name="First Name" value={user?.firstName} />
            <Detail name="Last Name" value={user?.lastName} />
            <Detail name="Email" value={user?.email} />
            <Detail name="Account Status" value={user ? label(user.status) : undefined} />
            {user?.platformRole && (
              <Detail name="Platform Role" value={platformRoleLabel(user.platformRole)} />
            )}
            {currentTenant && <Detail name="Clinic" value={currentTenant.name} />}
            {tenantRole && <Detail name="Clinic Role" value={tenantRoleLabel(tenantRole)} />}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function Detail({ name, value }: { name: string; value?: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{name}</p>
      <p className="mt-1 text-sm">{value ?? "—"}</p>
    </div>
  );
}
