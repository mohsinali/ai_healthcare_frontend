"use client";
/* eslint-disable react-hooks/set-state-in-effect -- server data initializes a local editable draft */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Save, X } from "lucide-react";
import { tenantApiRequest } from "@/lib/api/client";
import { mapApiFieldErrors } from "@/lib/api/errors";
import { useTenant } from "@/tenancy/tenant-provider";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { TimezoneCombobox } from "@/components/common/timezone-combobox";
import { CountryCombobox } from "@/components/common/country-combobox";
import { countryName } from "@/clinic/countries";
import { normalizeInternationalPhone } from "@/patients/validation";
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
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string>();
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
    onError: (error) => {
      const mapped = mapApiFieldErrors(error, editorFields);
      const mappedErrors = Object.fromEntries(
        Object.entries(mapped).filter(
          (entry): entry is [string, string] => Boolean(entry[1]),
        ),
      );
      if (Object.keys(mappedErrors).length) {
        setValidationErrors(mappedErrors);
        setSaveError(undefined);
        focusFirstError(mappedErrors);
      } else {
        setSaveError(
          `Unable to Save ${singular[0].toUpperCase() + singular.slice(1)}. Something went wrong while saving this ${singular}. Please try again.`,
        );
      }
    },
  });
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
  function changeField(key: string, value: FormValue) {
    setForm((current) => ({ ...current, [key]: value }));
    setValidationErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
    setSaveError(undefined);
  }
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
            changeField(
              key,
              props.type === "number" ? Number(e.target.value) : e.target.value,
            )
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
    const next = kind === "locations" ? validateLocation(form) : {};
    setValidationErrors(next);
    setSaveError(undefined);
    if (Object.keys(next).length) {
      focusFirstError(next);
      return;
    }
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
        <form onSubmit={submit} noValidate className="space-y-4">
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
                  <TimezoneCombobox
                    id="timezone"
                    label="Timezone"
                    disabled={!editable}
                    value={String(form.timezone ?? "")}
                    error={validationErrors.timezone}
                    onChange={(timezone) => changeField("timezone", timezone)}
                  />
                  {field("addressLine1", "Address Line 1", { required: true })}
                  {field("addressLine2", "Address Line 2")}
                  {field("city", "City", { required: true })}
                  {field("stateProvince", "State / Province", {
                    required: true,
                  })}
                  {field("postalCode", "Postal Code", { required: true })}
                  <CountryCombobox
                    id="countryCode"
                    label="Country"
                    disabled={!editable}
                    value={String(form.countryCode ?? "")}
                    error={validationErrors.countryCode}
                    onChange={(countryCode) => changeField("countryCode", countryCode)}
                  />
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
          {saveError && (
            <p role="alert" className="text-sm text-destructive">{saveError}</p>
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

const editorFields = Object.keys(fieldLabels);
const locationFields = [
  "name", "phone", "email", "timezone", "addressLine1", "addressLine2",
  "city", "stateProvince", "postalCode", "countryCode",
  "escalationPhoneNumber",
] as const;

function focusFirstError(errors: Record<string, string>) {
  requestAnimationFrame(() => {
    const first = locationFields.find((field) => errors[field]);
    if (first) document.getElementById(first)?.focus({ preventScroll: false });
  });
}

export function validateLocation(form: Record<string, FormValue>) {
  const errors: Record<string, string> = {};
  const required: [string, string][] = [
    ["name", "Location Name is required."],
    ["phone", "Phone is required."],
    ["timezone", "Select a valid timezone."],
    ["addressLine1", "Address Line 1 is required."],
    ["city", "City is required."],
    ["stateProvince", "State / Province is required."],
    ["postalCode", "Postal Code is required."],
    ["countryCode", "Select a valid country."],
  ];
  for (const [field, message] of required)
    if (!String(form[field] ?? "").trim()) errors[field] = message;
  const email = String(form.email ?? "").trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.email = "Enter a valid email address.";
  if (!countryName(String(form.countryCode ?? "")))
    errors.countryCode = "Select a valid country.";
  const phone = normalizeInternationalPhone(String(form.phone ?? ""));
  if (phone && !/^\+[1-9]\d{7,14}$/.test(phone))
    errors.phone = "Enter a valid international phone number.";
  const escalationPhone = normalizeInternationalPhone(
    String(form.escalationPhoneNumber ?? ""),
  );
  if (escalationPhone && !/^\+[1-9]\d{7,14}$/.test(escalationPhone))
    errors.escalationPhoneNumber =
      "Enter a valid international phone number.";
  return errors;
}
