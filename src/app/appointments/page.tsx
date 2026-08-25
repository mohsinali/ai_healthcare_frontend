"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/feedback/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { tenantApiRequest } from "@/lib/api/client";
import { useTenant } from "@/tenancy/tenant-provider";
import {
  appointmentName,
  appointmentVariant,
  clinicDateTime,
  PaginatedAppointments,
} from "@/appointments/types";
import { patientName } from "@/patients/types";

export default function Page() {
  const tenant = useTenant();
  const tenantId = tenant.currentTenant?.id ?? "";
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const query = useQuery({
    queryKey: ["appointments", tenantId, { search, status }],
    queryFn: () =>
      tenantApiRequest<PaginatedAppointments>(
        `/appointments?limit=50&search=${encodeURIComponent(search)}${status ? `&status=${status}` : ""}`,
        tenantId,
      ),
    enabled: Boolean(tenantId),
    meta: { tenantScoped: true },
  });
  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Appointments"
          description="Manage patient appointments and clinic scheduling."
          actions={
            <Button asChild>
              <Link href="/appointments/new">
                <Plus />
                Add Appointment
              </Link>
            </Button>
          }
        />
        <Card>
          <CardContent className="p-0">
            <div className="grid gap-3 border-b p-4 sm:grid-cols-[1fr_220px]">
              <div className="relative">
                <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search patient or appointment number"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                aria-label="Status"
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">All Statuses</option>
                {[
                  "BOOKED",
                  "CONFIRMED",
                  "CANCELLED",
                  "COMPLETED",
                  "NO_SHOW",
                ].map((x) => (
                  <option key={x} value={x}>
                    {appointmentName(x as never)}
                  </option>
                ))}
              </select>
            </div>
            {query.isLoading ? (
              <LoadingState />
            ) : query.isError ? (
              <ErrorState />
            ) : !query.data?.data.length ? (
              <EmptyState
                title="No Appointments Yet"
                description="Add the first appointment to begin clinic scheduling."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] text-left text-sm">
                  <thead className="border-b bg-muted/60 text-xs text-muted-foreground">
                    <tr>
                      {[
                        "Appointment",
                        "Date & Time",
                        "Patient",
                        "Provider",
                        "Service",
                        "Location",
                        "Status",
                      ].map((x) => (
                        <th className="px-4 py-3 font-medium" key={x}>
                          {x}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {query.data.data.map((a) => (
                      <tr
                        className="border-b last:border-0 hover:bg-muted/40"
                        key={a.id}
                      >
                        <td className="px-4 py-3">
                          <Link
                            className="font-medium hover:text-primary hover:underline"
                            href={`/appointments/${a.id}`}
                          >
                            {a.appointmentNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          {clinicDateTime(a.startAt, a.timezone)}
                        </td>
                        <td className="px-4 py-3">{patientName(a.patient)}</td>
                        <td className="px-4 py-3">
                          {a.provider.displayName ||
                            `${a.provider.firstName} ${a.provider.lastName}`}
                        </td>
                        <td className="px-4 py-3">{a.service.name}</td>
                        <td className="px-4 py-3">{a.location.name}</td>
                        <td className="px-4 py-3">
                          <StatusBadge variant={appointmentVariant(a.status)}>
                            {appointmentName(a.status)}
                          </StatusBadge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
