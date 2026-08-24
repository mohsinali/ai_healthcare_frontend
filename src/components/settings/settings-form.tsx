"use client";
/* eslint-disable react-hooks/set-state-in-effect -- server data initializes a local editable draft */
import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { TimezoneCombobox } from "@/components/common/timezone-combobox";
import { ErrorState, LoadingState } from "@/components/feedback/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { tenantApiRequest } from "@/lib/api/client";
import { mapApiFieldErrors } from "@/lib/api/errors";
import { dateFormatOptions, TenantSettings } from "@/settings/types";
import { useTenant } from "@/tenancy/tenant-provider";

export function SettingsForm() {
  const tenant = useTenant();
  const tenantId = tenant.currentTenant?.id ?? "";
  const queryClient = useQueryClient();
  const [form, setForm] = useState<TenantSettings>({
    dateFormat: "MM_DD_YYYY",
    timezone: "UTC",
  });
  const [success, setSuccess] = useState("");
  const query = useQuery({
    queryKey: ["settings", tenantId],
    queryFn: () => tenantApiRequest<TenantSettings>("/settings", tenantId),
    enabled: Boolean(tenantId),
    meta: { tenantScoped: true },
  });
  useEffect(() => {
    if (query.data) setForm(query.data);
  }, [query.data]);
  const save = useMutation({
    mutationFn: () =>
      tenantApiRequest<TenantSettings>("/settings", tenantId, {
        method: "PATCH",
        body: JSON.stringify(form),
      }),
    onSuccess: (value) => {
      queryClient.setQueryData(["settings", tenantId], value);
      setForm(value);
      setSuccess("Settings updated.");
    },
  });
  const errors = mapApiFieldErrors(save.error, ["dateFormat", "timezone"] as const);
  const owner = tenant.tenantRole === "CLINIC_OWNER";
  if (query.isLoading) return <LoadingState />;
  if (query.isError) return <ErrorState />;
  function submit(event: FormEvent) {
    event.preventDefault();
    setSuccess("");
    save.mutate();
  }
  return (
    <form onSubmit={submit}>
      <Card>
        <CardContent className="space-y-5 pt-6">
          <SelectField
            id="dateFormat"
            label="Date Format"
            value={form.dateFormat}
            disabled={!owner}
            error={errors.dateFormat}
            onChange={(dateFormat) => setForm((value) => ({ ...value, dateFormat: dateFormat as TenantSettings["dateFormat"] }))}
          >
            {dateFormatOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </SelectField>
          <TimezoneCombobox
            id="timezone"
            label="Tenant Timezone"
            value={form.timezone}
            disabled={!owner}
            error={errors.timezone}
            onChange={(timezone) => setForm((value) => ({ ...value, timezone }))}
          />
          {success && <p role="status" className="text-sm text-emerald-700">{success}</p>}
          {owner && (
            <Button type="submit" disabled={save.isPending}>
              <Save /> {save.isPending ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </CardContent>
      </Card>
    </form>
  );
}

function SelectField({ id, label, value, disabled, error, onChange, children }: {
  id: string; label: string; value: string; disabled: boolean; error?: string;
  onChange(value: string): void; children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select id={id} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}
        className={`h-10 w-full rounded-md border bg-background px-3 text-sm ${error ? "border-destructive ring-1 ring-destructive" : ""}`}>
        {children}
      </select>
      {error && <p id={`${id}-error`} className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
