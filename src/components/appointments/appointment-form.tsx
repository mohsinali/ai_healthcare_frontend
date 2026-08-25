"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, CalendarPlus } from "lucide-react";
import { Appointment, Availability, clinicTime } from "@/appointments/types";
import { Location, Paginated, Provider, Service } from "@/clinic/types";
import { SearchCombobox } from "@/components/common/search-combobox";
import { ErrorState, LoadingState } from "@/components/feedback/states";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, tenantApiRequest } from "@/lib/api/client";
import { Patient, PaginatedPatients, patientName } from "@/patients/types";
import { useTenant } from "@/tenancy/tenant-provider";

type Fields = {
  patientId: string;
  locationId: string;
  serviceId: string;
  providerId: string;
  date: string;
  start: string;
  reason: string;
  notes: string;
};
const empty: Fields = {
  patientId: "",
  locationId: "",
  serviceId: "",
  providerId: "",
  date: "",
  start: "",
  reason: "",
  notes: "",
};

export function AppointmentForm({
  appointment,
}: {
  appointment?: Appointment;
}) {
  const reschedule = Boolean(appointment);
  const tenant = useTenant();
  const tenantId = tenant.currentTenant?.id ?? "";
  const router = useRouter();
  const qc = useQueryClient();
  const [value, setValue] = useState<Fields>(() =>
    appointment
      ? {
          ...empty,
          patientId: appointment.patient.id,
          locationId: appointment.location.id,
          serviceId: appointment.service.id,
          providerId: appointment.provider.id,
        }
      : empty,
  );
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>(
    {},
  );
  const [general, setGeneral] = useState<string>();
  const patients = useQuery({
    queryKey: ["patients", tenantId, { status: "ACTIVE", selector: true }],
    queryFn: () =>
      tenantApiRequest<PaginatedPatients>(
        "/patients?status=ACTIVE&limit=100",
        tenantId,
      ),
    enabled: Boolean(tenantId && !reschedule),
    meta: { tenantScoped: true },
  });
  const locations = useQuery({
    queryKey: ["locations", tenantId, { status: "ACTIVE", selector: true }],
    queryFn: () =>
      tenantApiRequest<Paginated<Location>>(
        "/locations?status=ACTIVE&limit=100",
        tenantId,
      ),
    enabled: Boolean(tenantId && !reschedule),
    meta: { tenantScoped: true },
  });
  const services = useQuery({
    queryKey: ["location-services", tenantId, value.locationId],
    queryFn: () =>
      tenantApiRequest<Service[]>(
        `/locations/${value.locationId}/services`,
        tenantId,
      ),
    enabled: Boolean(tenantId && value.locationId && !reschedule),
    meta: { tenantScoped: true },
  });
  const providers = useQuery({
    queryKey: [
      "appointment-providers",
      tenantId,
      { locationId: value.locationId, serviceId: value.serviceId },
    ],
    queryFn: () =>
      tenantApiRequest<Provider[]>(
        `/scheduling/providers?locationId=${value.locationId}&serviceId=${value.serviceId}`,
        tenantId,
      ),
    enabled: Boolean(tenantId && value.locationId && value.serviceId),
    meta: { tenantScoped: true },
  });
  const availabilityKey = [
    "appointment-availability",
    tenantId,
    {
      locationId: value.locationId,
      serviceId: value.serviceId,
      providerId: value.providerId,
      date: value.date,
    },
  ];
  const availability = useQuery({
    queryKey: availabilityKey,
    queryFn: () =>
      tenantApiRequest<Availability>(
        `/scheduling/availability?locationId=${value.locationId}&serviceId=${value.serviceId}&providerId=${value.providerId}&date=${value.date}`,
        tenantId,
      ),
    enabled: Boolean(
      tenantId &&
      value.locationId &&
      value.serviceId &&
      value.providerId &&
      value.date,
    ),
    meta: { tenantScoped: true },
  });
  const set = (field: keyof Fields, next: string) => {
    setValue((x) => ({
      ...x,
      [field]: next,
      ...(field === "locationId"
        ? { serviceId: "", providerId: "", date: "", start: "" }
        : {}),
      ...(field === "serviceId" ? { providerId: "", date: "", start: "" } : {}),
      ...(field === "providerId" || field === "date" ? { start: "" } : {}),
    }));
    setErrors((x) => ({ ...x, [field]: undefined }));
    setGeneral(undefined);
  };
  const submit = () => {
    const next: typeof errors = {};
    if (!reschedule && !value.patientId)
      next.patientId = "Patient is required.";
    if (!value.locationId) next.locationId = "Select a Location.";
    if (!value.serviceId) next.serviceId = "Select a Service.";
    if (!value.providerId) next.providerId = "Select a Provider.";
    if (!value.date) next.date = "Select an appointment date.";
    if (!value.start) next.start = "Select an available appointment time.";
    setErrors(next);
    if (!Object.keys(next).length) mutation.mutate();
  };
  const mutation = useMutation({
    mutationFn: () =>
      tenantApiRequest<Appointment>(
        reschedule
          ? `/appointments/${appointment!.id}/reschedule`
          : "/appointments",
        tenantId,
        {
          method: "POST",
          body: JSON.stringify(
            reschedule
              ? { providerId: value.providerId, start: value.start }
              : {
                  patientId: value.patientId,
                  locationId: value.locationId,
                  serviceId: value.serviceId,
                  providerId: value.providerId,
                  start: value.start,
                  reason: value.reason || null,
                  notes: value.notes || null,
                },
          ),
        },
      ),
    onSuccess: async (a) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["appointments", tenantId] }),
        qc.invalidateQueries({ queryKey: ["appointment", tenantId, a.id] }),
        qc.invalidateQueries({
          queryKey: ["patient-appointments", tenantId, a.patient.id],
        }),
        qc.invalidateQueries({
          queryKey: ["appointment-availability", tenantId],
        }),
      ]);
      router.push(`/appointments/${a.id}`);
    },
    onError: async (error) => {
      if ((error as ApiError).status === 409) {
        set("start", "");
        setGeneral(
          "That time is no longer available. Please choose another time.",
        );
        await qc.invalidateQueries({ queryKey: availabilityKey });
      } else
        setGeneral((error as Error).message || "Unable to save appointment.");
    },
  });
  const patientOptions = (patients.data?.data ?? []).map((p: Patient) => ({
    value: p.id,
    label: patientName(p),
    detail: `DOB: ${p.dateOfBirth.slice(0, 10)} · Phone: ••••${p.phone.slice(-4)}`,
  }));
  const locationOptions = (locations.data?.data ?? []).map((x) => ({
    value: x.id,
    label: x.name,
    detail: x.timezone,
  }));
  const serviceOptions = (services.data ?? [])
    .filter((x) => x.status === "ACTIVE")
    .map((x) => ({
      value: x.id,
      label: x.name,
      detail: `${x.durationMinutes} min`,
    }));
  const providerOptions = (providers.data ?? []).map((x) => ({
    value: x.id,
    label: x.displayName || `${x.firstName} ${x.lastName}`,
    detail: x.title ?? undefined,
  }));
  const current = useMemo(
    () =>
      appointment
        ? `${new Intl.DateTimeFormat("en-US", { timeZone: appointment.timezone, dateStyle: "medium", timeStyle: "short" }).format(new Date(appointment.startAt))} (${appointment.timezone})`
        : "",
    [appointment],
  );
  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader
          title={reschedule ? "Reschedule Appointment" : "Add Appointment"}
          description={
            reschedule
              ? `Current appointment: ${current}`
              : "Book an available clinic appointment for an existing patient."
          }
        />
        <Card>
          <CardContent className="space-y-6 p-5">
            {!reschedule && (
              <section>
                <h2 className="mb-4 font-semibold">Patient</h2>
                <SearchCombobox
                  id="patientId"
                  label="Patient"
                  value={value.patientId}
                  options={patientOptions}
                  placeholder="Select a Patient"
                  error={errors.patientId}
                  onChange={(x) => set("patientId", x)}
                />
              </section>
            )}
            <section>
              <h2 className="mb-4 font-semibold">Appointment Details</h2>
              <div className="grid gap-4 md:grid-cols-3">
                {reschedule ? (
                  <>
                    <div>
                      <Label>Location</Label>
                      <p className="mt-2 text-sm">
                        {appointment!.location.name}
                      </p>
                    </div>
                    <div>
                      <Label>Service</Label>
                      <p className="mt-2 text-sm">
                        {appointment!.service.name} —{" "}
                        {appointment!.service.durationMinutes} min
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <SearchCombobox
                      id="locationId"
                      label="Location"
                      value={value.locationId}
                      options={locationOptions}
                      placeholder="Select a Location"
                      error={errors.locationId}
                      onChange={(x) => set("locationId", x)}
                    />
                    <SearchCombobox
                      id="serviceId"
                      label="Service"
                      value={value.serviceId}
                      options={serviceOptions}
                      placeholder="Select a Service"
                      disabled={!value.locationId}
                      error={errors.serviceId}
                      onChange={(x) => set("serviceId", x)}
                    />
                  </>
                )}
                <SearchCombobox
                  id="providerId"
                  label="Provider"
                  value={value.providerId}
                  options={providerOptions}
                  placeholder="Select a Provider"
                  disabled={!value.serviceId}
                  error={errors.providerId}
                  onChange={(x) => set("providerId", x)}
                />
              </div>
            </section>
            <section>
              <h2 className="mb-4 font-semibold">Date &amp; Time</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={value.date}
                    aria-invalid={Boolean(errors.date)}
                    onChange={(e) => set("date", e.target.value)}
                  />
                  {errors.date && (
                    <p className="text-sm text-destructive">{errors.date}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Available Time</Label>
                  {availability.isLoading ? (
                    <LoadingState />
                  ) : availability.isError ? (
                    <ErrorState />
                  ) : availability.data && !availability.data.slots.length ? (
                    <p className="rounded-md bg-muted p-3 text-sm">
                      No Available Times
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {availability.data?.slots.map((slot) => (
                        <button
                          type="button"
                          aria-pressed={value.start === slot.start}
                          className={`rounded-md border px-2 py-2 text-sm ${value.start === slot.start ? "border-primary bg-accent text-accent-foreground" : "hover:bg-muted"}`}
                          key={slot.start}
                          onClick={() => set("start", slot.start)}
                        >
                          {clinicTime(slot.start, availability.data.timezone)}
                        </button>
                      ))}
                    </div>
                  )}
                  {errors.start && (
                    <p className="text-sm text-destructive">{errors.start}</p>
                  )}
                </div>
              </div>
            </section>
            {!reschedule && (
              <section>
                <h2 className="mb-4 font-semibold">Additional Information</h2>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason</Label>
                    <Input
                      id="reason"
                      maxLength={500}
                      value={value.reason}
                      onChange={(e) => set("reason", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Administrative Notes</Label>
                    <textarea
                      id="notes"
                      maxLength={2000}
                      className="min-h-24 w-full rounded-md border bg-background p-3 text-sm"
                      value={value.notes}
                      onChange={(e) => set("notes", e.target.value)}
                    />
                  </div>
                </div>
              </section>
            )}
            {general && (
              <p
                role="alert"
                className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
              >
                {general}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button asChild variant="outline">
                <Link
                  href={
                    reschedule
                      ? `/appointments/${appointment!.id}`
                      : "/appointments"
                  }
                >
                  Cancel
                </Link>
              </Button>
              <Button
                type="button"
                loading={mutation.isPending}
                onClick={submit}
              >
                {reschedule ? <CalendarClock /> : <CalendarPlus />}
                {reschedule ? "Reschedule Appointment" : "Add Appointment"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
