"use client";
import Link from "next/link";
import { Save, UserPlus } from "lucide-react";
import { PatientInput } from "@/patients/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { PatientFieldErrors } from "@/patients/validation";
const fields: {
  key: keyof PatientInput;
  label: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
}[] = [
  { key: "firstName", label: "First Name", required: true, maxLength: 80 },
  { key: "middleName", label: "Middle Name", maxLength: 80 },
  { key: "lastName", label: "Last Name", required: true, maxLength: 80 },
  { key: "dateOfBirth", label: "Date of Birth", type: "date", required: true },
  { key: "phone", label: "Phone", type: "tel", required: true, maxLength: 30 },
  { key: "email", label: "Email", type: "email", maxLength: 254 },
  { key: "addressLine1", label: "Address Line 1", maxLength: 160 },
  { key: "addressLine2", label: "Address Line 2", maxLength: 160 },
  { key: "city", label: "City", maxLength: 100 },
  { key: "stateProvince", label: "State / Province", maxLength: 100 },
  { key: "postalCode", label: "Postal Code", maxLength: 24 },
  { key: "countryCode", label: "Country", maxLength: 2 },
];
export function PatientForm({
  value,
  onSubmit,
  cancelHref,
  mode,
  busy,
  error,
  errors,
  onFieldChange,
}: {
  value: PatientInput;
  onSubmit: () => void;
  cancelHref: string;
  mode: "create" | "edit";
  busy: boolean;
  error?: string;
  errors: PatientFieldErrors;
  onFieldChange: (field: keyof PatientInput, value: string) => void;
}) {
  const render = (keys: (keyof PatientInput)[]) => (
    <div className="grid gap-4 md:grid-cols-2">
      {fields
        .filter((f) => keys.includes(f.key))
        .map((f) => (
          <div
            className={
              f.key === "addressLine1" || f.key === "addressLine2"
                ? "md:col-span-2"
                : ""
            }
            key={f.key}
          >
            <Label htmlFor={f.key}>{f.label}</Label>
            <Input
              id={f.key}
              className={cn(
                "mt-1.5",
                errors[f.key] &&
                  "border-destructive focus-visible:ring-destructive",
              )}
              type={f.type}
              required={f.required}
              maxLength={f.maxLength}
              value={value[f.key]}
              aria-invalid={Boolean(errors[f.key])}
              aria-describedby={
                errors[f.key]
                  ? `${f.key}-error`
                  : f.key === "phone"
                    ? "phone-help"
                    : undefined
              }
              placeholder={f.key === "phone" ? "+1 305 555 0123" : undefined}
              onChange={(e) => onFieldChange(f.key, e.target.value)}
            />
            {f.key === "phone" && !errors.phone && (
              <p id="phone-help" className="mt-1 text-xs text-muted-foreground">
                Use international format, for example +1 305 555 0123.
              </p>
            )}
            {errors[f.key] && (
              <p
                id={`${f.key}-error`}
                role="alert"
                className="mt-1 text-sm text-destructive"
              >
                {errors[f.key]}
              </p>
            )}
          </div>
        ))}
    </div>
  );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      noValidate
      className="space-y-6"
    >
      <section className="rounded-lg border bg-card p-5">
        <h2 className="mb-4 text-lg font-semibold">Personal Information</h2>
        {render(["firstName", "middleName", "lastName", "dateOfBirth"])}
      </section>
      <section className="rounded-lg border bg-card p-5">
        <h2 className="mb-4 text-lg font-semibold">Contact Information</h2>
        {render(["phone", "email"])}
        <div className="mt-4">
          <Label htmlFor="preferredContactMethod">
            Preferred Contact Method
          </Label>
          <select
            id="preferredContactMethod"
            className={cn(
              "mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm",
              errors.preferredContactMethod && "border-destructive",
            )}
            aria-invalid={Boolean(errors.preferredContactMethod)}
            aria-describedby={
              errors.preferredContactMethod
                ? "preferredContactMethod-error"
                : undefined
            }
            value={value.preferredContactMethod}
            onChange={(e) =>
              onFieldChange("preferredContactMethod", e.target.value)
            }
          >
            <option value="">No preference</option>
            <option value="PHONE">Phone</option>
            <option value="EMAIL">Email</option>
          </select>
          {errors.preferredContactMethod && (
            <p
              id="preferredContactMethod-error"
              role="alert"
              className="mt-1 text-sm text-destructive"
            >
              {errors.preferredContactMethod}
            </p>
          )}
        </div>
      </section>
      <section className="rounded-lg border bg-card p-5">
        <h2 className="mb-4 text-lg font-semibold">Address</h2>
        {render([
          "addressLine1",
          "addressLine2",
          "city",
          "stateProvince",
          "postalCode",
          "countryCode",
        ])}
      </section>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-3 border-t pt-5">
        <Button variant="outline" asChild>
          <Link href={cancelHref}>Cancel</Link>
        </Button>
        <Button type="submit" disabled={busy}>
          {mode === "create" ? <UserPlus /> : <Save />}
          {busy
            ? "Saving…"
            : mode === "create"
              ? "Add Patient"
              : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
