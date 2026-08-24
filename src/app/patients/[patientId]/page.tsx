"use client";
import { use, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, UserCheck, UserX } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { ErrorState, LoadingState } from "@/components/feedback/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { tenantApiRequest } from "@/lib/api/client";
import { useTenant } from "@/tenancy/tenant-provider";
import {
  canChangePatientStatus,
  canEditPatient,
  dateOnly,
  Patient,
  patientName,
} from "@/patients/types";
const Row = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div>
    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {label}
    </dt>
    <dd className="mt-1 text-sm">{children || "—"}</dd>
  </div>
);
export default function Page({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const id = use(params).patientId;
  const tenant = useTenant();
  const tenantId = tenant.currentTenant?.id ?? "";
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const query = useQuery({
    queryKey: ["patient", tenantId, id],
    queryFn: () =>
      tenantApiRequest<Patient>(`/patients/${id}`, tenantId),
    enabled: Boolean(tenantId),
    meta: { tenantScoped: true },
  });
  const status = useMutation({
    mutationFn: (next: string) =>
      tenantApiRequest<Patient>(`/patients/${id}/status`, tenantId, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      }),
    onSuccess: async () => {
      setConfirm(false);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["patient", tenantId, id] }),
        qc.invalidateQueries({ queryKey: ["patients", tenantId] }),
      ]);
    },
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
  const p = query.data;
  const next = p.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader
          title={patientName(p)}
          description="Patient administrative record."
          actions={
            <div className="flex gap-2">
              {canChangePatientStatus(tenant.tenantRole) && (
                <Button variant="outline" onClick={() => setConfirm(true)}>
                  {p.status === "ACTIVE" ? <UserX /> : <UserCheck />}
                  {p.status === "ACTIVE"
                    ? "Deactivate Patient"
                    : "Reactivate Patient"}
                </Button>
              )}
              {canEditPatient(tenant.tenantRole) && (
                <Button asChild>
                  <Link href={`/patients/${id}/edit`}>
                    <Pencil />
                    Edit Patient
                  </Link>
                </Button>
              )}
            </div>
          }
        />
        <StatusBadge variant={p.status === "ACTIVE" ? "success" : "neutral"}>
          {p.status === "ACTIVE" ? "Active" : "Inactive"}
        </StatusBadge>
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardContent className="p-5">
              <h2 className="mb-4 font-semibold">Personal Information</h2>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Row label="Full Name">{patientName(p)}</Row>
                <Row label="Date of Birth">{dateOnly(p.dateOfBirth)}</Row>
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <h2 className="mb-4 font-semibold">Contact Information</h2>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Row label="Phone">{p.phone}</Row>
                <Row label="Email">{p.email ?? "—"}</Row>
                <Row label="Preferred Contact">
                  {p.preferredContactMethod
                    ? `${p.preferredContactMethod[0]}${p.preferredContactMethod.slice(1).toLowerCase()}`
                    : "—"}
                </Row>
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <h2 className="mb-4 font-semibold">Address</h2>
              <address className="text-sm not-italic leading-6">
                {[
                  p.addressLine1,
                  p.addressLine2,
                  [p.city, p.stateProvince, p.postalCode]
                    .filter(Boolean)
                    .join(", "),
                  p.countryCode,
                ]
                  .filter(Boolean)
                  .map((x) => <div key={x}>{x}</div>) || "—"}
              </address>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <h2 className="mb-4 font-semibold">Record Information</h2>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Row label="Created">
                  {new Date(p.createdAt).toLocaleString()}
                </Row>
                <Row label="Updated">
                  {new Date(p.updatedAt).toLocaleString()}
                </Row>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
      {confirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="status-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="max-w-md rounded-lg bg-background p-6">
            <h2 id="status-title" className="text-lg font-semibold">
              {p.status === "ACTIVE"
                ? "Deactivate Patient"
                : "Reactivate Patient"}
            </h2>
            <p className="my-3 text-sm text-muted-foreground">
              {p.status === "ACTIVE"
                ? "This patient will remain available for historical reference but will be marked inactive."
                : "This patient will be marked active again."}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirm(false)}>
                Cancel
              </Button>
              <Button
                disabled={status.isPending}
                onClick={() => status.mutate(next)}
              >
                {p.status === "ACTIVE" ? "Deactivate" : "Reactivate"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
