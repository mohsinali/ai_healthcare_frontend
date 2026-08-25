"use client";
import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { Appointment } from "@/appointments/types";
import { AppointmentForm } from "@/components/appointments/appointment-form";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorState, LoadingState } from "@/components/feedback/states";
import { tenantApiRequest } from "@/lib/api/client";
import { useTenant } from "@/tenancy/tenant-provider";
export default function Page({
  params,
}: {
  params: Promise<{ appointmentId: string }>;
}) {
  const id = use(params).appointmentId;
  const tenant = useTenant();
  const tenantId = tenant.currentTenant?.id ?? "";
  const query = useQuery({
    queryKey: ["appointment", tenantId, id],
    queryFn: () =>
      tenantApiRequest<Appointment>(`/appointments/${id}`, tenantId),
    enabled: Boolean(tenantId),
    meta: { tenantScoped: true },
  });
  if (query.isLoading)
    return (
      <AppShell>
        <LoadingState />
      </AppShell>
    );
  if (query.isError || !query.data)
    return (
      <AppShell>
        <ErrorState />
      </AppShell>
    );
  return <AppointmentForm appointment={query.data} />;
}
