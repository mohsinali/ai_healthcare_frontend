"use client";
/* eslint-disable react-hooks/set-state-in-effect -- server data initializes a local editable draft */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Save, X } from "lucide-react";
import { tenantApiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/client";
import { useTenant } from "@/tenancy/tenant-provider";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { ErrorState, LoadingState } from "@/components/feedback/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AssignmentManager } from "@/components/clinic/assignment-manager";
import {
  BusinessHour,
  canManage,
  Location,
  Provider,
  Service,
  timezoneOptions,
} from "@/clinic/types";
const DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];
type Kind = "locations" | "providers" | "services";
type FormValue = string | number | null;
const empty = {
  name: "",
  phone: "",
  email: "",
  timezone: "America/New_York",
  addressLine1: "",
  addressLine2: "",
  city: "",
  stateProvince: "",
  postalCode: "",
  countryCode: "US",
  escalationPhoneNumber: "",
  firstName: "",
  lastName: "",
  displayName: "",
  title: "",
  description: "",
  durationMinutes: 30,
  status: "ACTIVE",
};
export function ConfigEditor({ kind, id }: { kind: Kind; id?: string }) {
  const tenant = useTenant();
  const tenantId = tenant.currentTenant?.id ?? "";
  const client = useQueryClient();
  const router = useRouter();
  const [form, setForm] = useState<Record<string, FormValue>>({
    ...empty,
  });
  const [hours, setHours] = useState<BusinessHour[]>([]);
  const query = useQuery({
    queryKey: [kind.slice(0, -1), tenantId, id],
    queryFn: () =>
      tenantApiRequest<Location | Provider | Service>(
        `/${kind}/${id}`,
        tenantId,
      ),
    enabled: Boolean(id && tenantId),
    meta: { tenantScoped: true },
  });
  useEffect(() => {
    if (query.data)
      setForm({ ...empty, ...query.data } as unknown as Record<
        string,
        FormValue
      >);
    if (query.data && "businessHours" in query.data && query.data.businessHours)
      setHours(query.data.businessHours);
  }, [query.data]);
  const singular = kind.slice(0, -1);
  const save = useMutation({
    mutationFn: async () => {
      const payload = payloadFor(kind, form, Boolean(id));
      const value = await tenantApiRequest<{ id: string }>(
        id ? `/${kind}/${id}` : `/${kind}`,
        tenantId,
        { method: id ? "PATCH" : "POST", body: JSON.stringify(payload) },
      );
      if (kind === "locations" && id && hours.length)
        await tenantApiRequest(`/locations/${id}/business-hours`, tenantId, {
          method: "PUT",
          body: JSON.stringify({
            hours: hours.map(
              ({ dayOfWeek, isClosed, openTime, closeTime }) => ({
                dayOfWeek,
                isClosed,
                openTime,
                closeTime,
              }),
            ),
          }),
        });
      return value;
    },
    onSuccess: async (value) => {
      await Promise.all([
        client.invalidateQueries({ queryKey: [kind, tenantId] }),
        client.invalidateQueries({
          queryKey: [kind.slice(0, -1), tenantId, id || value.id],
        }),
      ]);
      router.push(`/${kind}/${id || value.id}`);
    },
  });
  const validationErrors = getFieldErrors(save.error);
  if (id && query.isLoading)
    return (
      <AppShell>
        <LoadingState />
      </AppShell>
    );
  if (id && query.isError)
    return (
      <AppShell>
        <ErrorState />
      </AppShell>
    );
  const editable = canManage(tenant.tenantRole);
  function field(
    key: string,
    label: string,
    props: React.ComponentProps<typeof Input> = {},
  ) {
    return (
      <div className="space-y-2">
        <Label htmlFor={key}>{label}</Label>
        <Input
          id={key}
          value={form[key] ?? ""}
          disabled={!editable}
          aria-invalid={Boolean(validationErrors[key])}
          aria-describedby={validationErrors[key] ? `${key}-error` : undefined}
          className={
            validationErrors[key]
              ? "border-destructive ring-1 ring-destructive"
              : undefined
          }
          onChange={(e) =>
            setForm((x) => ({
              ...x,
              [key]:
                props.type === "number"
                  ? Number(e.target.value)
                  : e.target.value,
            }))
          }
          {...props}
        />
        {validationErrors[key] && (
          <p id={`${key}-error`} className="text-sm text-destructive">
            {validationErrors[key]}
          </p>
        )}
      </div>
    );
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    save.mutate();
  }
  const title = id
    ? kind === "providers"
      ? form.displayName || `${form.firstName} ${form.lastName}`
      : form.name
    : `Add ${singular[0].toUpperCase() + singular.slice(1)}`;
  return (
    <AppShell>
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link href={id ? `/${kind}/${id}` : `/${kind}`}>
            <ArrowLeft />
            {id
              ? `Back to ${String(title)}`
              : `Back to ${kind[0].toUpperCase() + kind.slice(1)}`}
          </Link>
        </Button>
        <PageHeader
          title={String(title)}
          description={
            id
              ? "View and manage clinic configuration."
              : `Create a clinic ${singular}.`
          }
        />
        <form onSubmit={submit} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {kind === "locations"
                  ? "Location Information"
                  : kind === "providers"
                    ? "Provider Information"
                    : "Service Information"}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {kind === "locations" ? (
                <>
                  {field("name", "Location Name", {
                    required: true,
                    maxLength: 120,
                  })}
                  {field("phone", "Phone", {
                    required: true,
                    placeholder: "+13055550123",
                  })}
                  {field("email", "Email", { type: "email" })}
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <select
                      id="timezone"
                      disabled={!editable}
                      value={form.timezone ?? ""}
                      onChange={(e) =>
                        setForm((x) => ({ ...x, timezone: e.target.value }))
                      }
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    >
                      {timezoneOptions.map((zone) => (
                        <option key={zone}>{zone}</option>
                      ))}
                    </select>
                  </div>
                  {field("addressLine1", "Address Line 1", { required: true })}
                  {field("addressLine2", "Address Line 2")}
                  {field("city", "City", { required: true })}
                  {field("stateProvince", "State / Province", {
                    required: true,
                  })}
                  {field("postalCode", "Postal Code", { required: true })}
                  {field("countryCode", "Country", {
                    required: true,
                    maxLength: 2,
                  })}
                  {field("escalationPhoneNumber", "Escalation Phone Number", {
                    placeholder: "+13055550124",
                  })}
                </>
              ) : kind === "providers" ? (
                <>
                  {field("firstName", "First Name", { required: true })}
                  {field("lastName", "Last Name", { required: true })}
                  {field("displayName", "Display Name")}
                  {field("title", "Title")}
                  {field("email", "Email", { type: "email" })}
                  {field("phone", "Phone", { placeholder: "+13055550123" })}
                </>
              ) : (
                <>
                  {field("name", "Service Name", { required: true })}
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <textarea
                      id="description"
                      disabled={!editable}
                      value={form.description ?? ""}
                      onChange={(e) =>
                        setForm((x) => ({ ...x, description: e.target.value }))
                      }
                      className="min-h-24 w-full rounded-md border bg-background p-3 text-sm"
                    />
                  </div>
                  {field("durationMinutes", "Duration (Minutes)", {
                    type: "number",
                    min: 1,
                    max: 1440,
                    required: true,
                  })}
                </>
              )}
              {id && (
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    disabled={!editable}
                    value={form.status ?? "ACTIVE"}
                    onChange={(e) =>
                      setForm((x) => ({ ...x, status: e.target.value }))
                    }
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              )}
            </CardContent>
          </Card>
          {kind === "locations" && id && hours.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Business Hours</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {DAYS.map((day) => {
                  const value = hours.find((x) => x.dayOfWeek === day)!;
                  return (
                    <div
                      key={day}
                      className="grid items-center gap-3 rounded-md border p-3 sm:grid-cols-[140px_110px_1fr_1fr]"
                    >
                      <span className="text-sm font-medium capitalize">
                        {day.toLowerCase()}
                      </span>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          disabled={!editable}
                          checked={!value.isClosed}
                          onChange={(e) =>
                            setHours((xs) =>
                              xs.map((x) =>
                                x.dayOfWeek === day
                                  ? {
                                      ...x,
                                      isClosed: !e.target.checked,
                                      openTime: e.target.checked
                                        ? x.openTime || "09:00"
                                        : null,
                                      closeTime: e.target.checked
                                        ? x.closeTime || "17:00"
                                        : null,
                                    }
                                  : x,
                              ),
                            )
                          }
                        />
                        Open
                      </label>
                      <Input
                        type="time"
                        disabled={!editable || value.isClosed}
                        value={value.openTime || ""}
                        onChange={(e) =>
                          setHours((xs) =>
                            xs.map((x) =>
                              x.dayOfWeek === day
                                ? { ...x, openTime: e.target.value }
                                : x,
                            ),
                          )
                        }
                      />
                      <Input
                        type="time"
                        disabled={!editable || value.isClosed}
                        value={value.closeTime || ""}
                        onChange={(e) =>
                          setHours((xs) =>
                            xs.map((x) =>
                              x.dayOfWeek === day
                                ? { ...x, closeTime: e.target.value }
                                : x,
                            ),
                          )
                        }
                      />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
          {id && <Relations kind={kind} entityId={id} />}{" "}
          {save.error && (
            <p className="text-sm text-destructive">{save.error.message}</p>
          )}
          {editable && (
            <div className="flex flex-wrap gap-2">
              <Button loading={save.isPending}>
                {id ? <Save /> : <Plus />}
                {id
                  ? "Save Changes"
                  : `Add ${singular[0].toUpperCase() + singular.slice(1)}`}
              </Button>
              <Button asChild type="button" variant="outline">
                <Link href={id ? `/${kind}/${id}` : `/${kind}`}>
                  <X />
                  Cancel
                </Link>
              </Button>
            </div>
          )}
        </form>
      </div>
    </AppShell>
  );
}
function Relations({ kind, entityId }: { kind: Kind; entityId: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Assignments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {kind === "providers" && (
          <>
            <AssignmentManager
              ownerType="providers"
              ownerId={entityId}
              targetType="locations"
              title="Locations"
            />
            <div className="border-t" />
            <AssignmentManager
              ownerType="providers"
              ownerId={entityId}
              targetType="services"
              title="Services"
            />
          </>
        )}
        {kind === "locations" && (
          <AssignmentManager
            ownerType="locations"
            ownerId={entityId}
            targetType="services"
            title="Services"
          />
        )}
        {kind === "services" && (
          <>
            <AssignmentManager
              ownerType="services"
              ownerId={entityId}
              targetType="locations"
              title="Locations"
            />
            <div className="border-t" />
            <AssignmentManager
              ownerType="services"
              ownerId={entityId}
              targetType="providers"
              title="Providers"
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
export function payloadFor(
  kind: Kind,
  f: Record<string, FormValue>,
  isUpdate = false,
) {
  const status = isUpdate ? ["status"] : [];
  if (kind === "locations")
    return pick(f, [
      "name",
      "phone",
      "email",
      "timezone",
      "addressLine1",
      "addressLine2",
      "city",
      "stateProvince",
      "postalCode",
      "countryCode",
      "escalationPhoneNumber",
      ...status,
    ]);
  if (kind === "providers")
    return pick(f, [
      "firstName",
      "lastName",
      "displayName",
      "title",
      "email",
      "phone",
      ...status,
    ]);
  return pick(f, ["name", "description", "durationMinutes", ...status]);
}
function pick(source: Record<string, FormValue>, keys: string[]) {
  return Object.fromEntries(
    keys
      .filter(
        (k) =>
          source[k] !== "" && source[k] !== undefined && source[k] !== null,
      )
      .map((k) => [k, source[k]]),
  );
}

const fieldLabels: Record<string, string> = {
  name: "Location Name",
  phone: "Phone",
  email: "Email",
  timezone: "Timezone",
  addressLine1: "Address Line 1",
  addressLine2: "Address Line 2",
  city: "City",
  stateProvince: "State / Province",
  postalCode: "Postal Code",
  countryCode: "Country",
  escalationPhoneNumber: "Escalation Phone Number",
  firstName: "First Name",
  lastName: "Last Name",
  displayName: "Display Name",
  title: "Title",
  description: "Description",
  durationMinutes: "Duration",
  status: "Status",
};

export function getFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError)) return {};
  const details = error.details as { message?: string | string[] } | undefined;
  const messages = Array.isArray(details?.message)
    ? details.message
    : details?.message
      ? [details.message]
      : [];
  const errors: Record<string, string> = {};
  for (const message of messages) {
    const key = Object.keys(fieldLabels).find(
      (candidate) =>
        message === candidate ||
        message.startsWith(`${candidate} `) ||
        message.includes(`property ${candidate} `),
    );
    if (key) errors[key] = `${fieldLabels[key]}: ${message}`;
  }
  return errors;
}
