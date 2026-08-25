"use client";
import { use, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Check, XCircle } from "lucide-react";
import {
  Appointment,
  appointmentName,
  appointmentVariant,
  clinicDateTime,
  clinicTime,
} from "@/appointments/types";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { ErrorState, LoadingState } from "@/components/feedback/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { tenantApiRequest } from "@/lib/api/client";
import { patientName } from "@/patients/types";
import { useTenant } from "@/tenancy/tenant-provider";

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
  params: Promise<{ appointmentId: string }>;
}) {
  const id = use(params).appointmentId;
  const tenant = useTenant();
  const tenantId = tenant.currentTenant?.id ?? "";
  const qc = useQueryClient();
  const [cancel, setCancel] = useState(false);
  const [reason, setReason] = useState("");
  const query = useQuery({
    queryKey: ["appointment", tenantId, id],
    queryFn: () =>
      tenantApiRequest<Appointment>(`/appointments/${id}`, tenantId),
    enabled: Boolean(tenantId),
    meta: { tenantScoped: true },
  });
  const invalidate = async (a: Appointment) =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["appointment", tenantId, id] }),
      qc.invalidateQueries({ queryKey: ["appointments", tenantId] }),
      qc.invalidateQueries({
        queryKey: ["patient-appointments", tenantId, a.patient.id],
      }),
      qc.invalidateQueries({
        queryKey: ["appointment-availability", tenantId],
      }),
    ]);
  const confirm = useMutation({
    mutationFn: () =>
      tenantApiRequest<Appointment>(`/appointments/${id}/confirm`, tenantId, {
        method: "POST",
      }),
    onSuccess: invalidate,
  });
  const cancelMutation = useMutation({
    mutationFn: () =>
      tenantApiRequest<Appointment>(`/appointments/${id}/cancel`, tenantId, {
        method: "POST",
        body: JSON.stringify({ reason: reason || null }),
      }),
    onSuccess: async (a) => {
      setCancel(false);
      await invalidate(a);
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
  const a = query.data;
  const active = a.status === "BOOKED" || a.status === "CONFIRMED";
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader
          title={a.appointmentNumber}
          description="Appointment operational details."
          actions={
            <div className="flex flex-wrap gap-2">
              {a.status === "BOOKED" && (
                <Button
                  variant="outline"
                  loading={confirm.isPending}
                  onClick={() => confirm.mutate()}
                >
                  <Check />
                  Confirm Appointment
                </Button>
              )}
              {active && (
                <Button asChild variant="outline">
                  <Link href={`/appointments/${id}/reschedule`}>
                    <CalendarClock />
                    Reschedule
                  </Link>
                </Button>
              )}
              {active && (
                <Button variant="destructive" onClick={() => setCancel(true)}>
                  <XCircle />
                  Cancel Appointment
                </Button>
              )}
            </div>
          }
        />
        <StatusBadge variant={appointmentVariant(a.status)}>
          {appointmentName(a.status)}
        </StatusBadge>
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardContent className="p-5">
              <h2 className="mb-4 font-semibold">Appointment</h2>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Row label="Date & Time">
                  {clinicDateTime(a.startAt, a.timezone)}
                </Row>
                <Row label="Ends">{clinicTime(a.endAt, a.timezone)}</Row>
                <Row label="Duration">{a.service.durationMinutes} minutes</Row>
                <Row label="Timezone">{a.timezone}</Row>
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <h2 className="mb-4 font-semibold">Patient</h2>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Row label="Name">
                  <Link
                    className="hover:underline"
                    href={`/patients/${a.patient.id}`}
                  >
                    {patientName(a.patient)}
                  </Link>
                </Row>
                <Row label="DOB">{a.patient.dateOfBirth.slice(0, 10)}</Row>
                <Row label="Phone">{a.patient.phone}</Row>
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <h2 className="mb-4 font-semibold">Clinic</h2>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Row label="Location">{a.location.name}</Row>
                <Row label="Provider">
                  {a.provider.displayName ||
                    `${a.provider.firstName} ${a.provider.lastName}`}
                </Row>
                <Row label="Service">{a.service.name}</Row>
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <h2 className="mb-4 font-semibold">Additional Information</h2>
              <dl className="space-y-4">
                <Row label="Reason">{a.reason}</Row>
                <Row label="Administrative Notes">{a.notes}</Row>
                {a.status === "CANCELLED" && (
                  <Row label="Cancellation Reason">{a.cancellationReason}</Row>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardContent className="p-5">
            <h2 className="mb-4 font-semibold">History</h2>
            <ol className="space-y-3">
              {a.events?.map((event) => (
                <li
                  className="flex justify-between gap-4 border-b pb-3 text-sm last:border-0"
                  key={event.id}
                >
                  <span>{appointmentName(event.type as never)}</span>
                  <time className="text-muted-foreground">
                    {clinicDateTime(event.occurredAt, a.timezone)}
                  </time>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
      {cancel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-title"
        >
          <div className="w-full max-w-md rounded-lg bg-background p-6">
            <h2 id="cancel-title" className="text-lg font-semibold">
              Cancel Appointment
            </h2>
            <p className="my-3 text-sm text-muted-foreground">
              Are you sure you want to cancel this appointment?
            </p>
            <div className="space-y-2">
              <Label htmlFor="cancelReason">Cancellation Reason</Label>
              <Input
                id="cancelReason"
                value={reason}
                maxLength={500}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCancel(false)}>
                Keep Appointment
              </Button>
              <Button
                variant="destructive"
                loading={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate()}
              >
                Cancel Appointment
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
