"use client";
import Link from "next/link";
import type { FormEvent } from "react";
import { Plus, Save } from "lucide-react";
import type { Location } from "@/clinic/types";
import { SearchCombobox } from "@/components/common/search-combobox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isInternationalPhone } from "@/telephony/format";
import type { TelephonyNumberInput } from "@/telephony/types";

export type TelephonyFormErrors = Partial<
  Record<keyof TelephonyNumberInput | "scope", string>
>;
export function validateTelephonyForm(
  value: TelephonyNumberInput,
  scope: "ALL" | "LOCATION",
) {
  const errors: TelephonyFormErrors = {};
  if (value.provider !== "TWILIO") errors.provider = "Provider is required.";
  if (!value.phoneNumber.trim())
    errors.phoneNumber = "Phone Number is required.";
  else if (!isInternationalPhone(value.phoneNumber))
    errors.phoneNumber = "Enter a valid international phone number.";
  if (scope === "LOCATION" && !value.locationId)
    errors.locationId = "Location is required for a specific location.";
  if ((value.providerPhoneNumberId ?? "").length > 255)
    errors.providerPhoneNumberId =
      "Provider Reference must be 255 characters or fewer.";
  return errors;
}
export function TelephonyForm({
  mode,
  value,
  scope,
  locations,
  errors,
  isSubmitting,
  onChange,
  onScopeChange,
  onSubmit,
  cancelHref,
}: {
  mode: "create" | "edit";
  value: TelephonyNumberInput;
  scope: "ALL" | "LOCATION";
  locations: Location[];
  errors: TelephonyFormErrors;
  isSubmitting: boolean;
  onChange(value: TelephonyNumberInput): void;
  onScopeChange(value: "ALL" | "LOCATION"): void;
  onSubmit(): void;
  cancelHref: string;
}) {
  const set = <K extends keyof TelephonyNumberInput>(
    key: K,
    next: TelephonyNumberInput[K],
  ) => onChange({ ...value, [key]: next });
  const options = locations
    .filter((x) => x.status === "ACTIVE" || x.id === value.locationId)
    .map((x) => ({
      value: x.id,
      label: x.name,
      detail: x.status === "INACTIVE" ? "Inactive" : x.locationNumber,
    }));
  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Phone Number Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Provider" id="provider" error={errors.provider}>
              <select
                id="provider"
                value={value.provider}
                onChange={(e) => set("provider", e.target.value as "TWILIO")}
                aria-invalid={Boolean(errors.provider)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="TWILIO">Twilio</option>
              </select>
            </Field>
            <Field
              label="Phone Number"
              id="phoneNumber"
              error={errors.phoneNumber}
            >
              <Input
                id="phoneNumber"
                type="tel"
                autoComplete="tel"
                placeholder="+1 305 555 1001"
                value={value.phoneNumber}
                onChange={(e) => set("phoneNumber", e.target.value)}
                aria-invalid={Boolean(errors.phoneNumber)}
                aria-describedby={
                  errors.phoneNumber ? "phoneNumber-error" : "phoneNumber-help"
                }
              />
              <p
                id="phoneNumber-help"
                className="text-xs text-muted-foreground"
              >
                Use an international phone number, for example +1 305 555 1001.
              </p>
            </Field>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Scope</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {(["ALL", "LOCATION"] as const).map((item) => (
                <label
                  key={item}
                  className="flex cursor-pointer gap-3 rounded-md border p-4"
                >
                  <input
                    type="radio"
                    name="scope"
                    checked={scope === item}
                    onChange={() => onScopeChange(item)}
                  />
                  <span>
                    <span className="block text-sm font-medium">
                      {item === "ALL" ? "All Locations" : "Specific Location"}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {item === "ALL"
                        ? "The caller's location can be determined later during the conversation."
                        : "Calls are routed directly to the selected clinic location."}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          {scope === "LOCATION" && (
            <SearchCombobox
              id="locationId"
              label="Location"
              value={value.locationId ?? ""}
              options={options}
              placeholder="Select a Location"
              error={errors.locationId}
              onChange={(id) => set("locationId", id)}
            />
          )}
          <Field
            label="Provider Reference"
            id="providerPhoneNumberId"
            error={errors.providerPhoneNumberId}
          >
            <Input
              id="providerPhoneNumberId"
              value={value.providerPhoneNumberId ?? ""}
              onChange={(e) =>
                set("providerPhoneNumberId", e.target.value || null)
              }
              aria-invalid={Boolean(errors.providerPhoneNumberId)}
              aria-describedby={
                errors.providerPhoneNumberId
                  ? "providerPhoneNumberId-error"
                  : "providerPhoneNumberId-help"
              }
            />
            <p
              id="providerPhoneNumberId-help"
              className="text-xs text-muted-foreground"
            >
              Optional provider-side identifier reserved for future Twilio
              integration.
            </p>
          </Field>
        </CardContent>
      </Card>
      <div className="flex flex-wrap justify-end gap-2">
        <Button asChild type="button" variant="outline">
          <Link href={cancelHref}>Cancel</Link>
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {mode === "create" ? <Plus /> : <Save />}
          {isSubmitting
            ? "Saving…"
            : mode === "create"
              ? "Add Phone Number"
              : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
function Field({
  label,
  id,
  error,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
