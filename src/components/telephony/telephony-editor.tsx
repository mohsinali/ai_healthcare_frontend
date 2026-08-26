"use client";
/* eslint-disable react-hooks/set-state-in-effect -- server data initializes the editable draft */
import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { Location, Paginated } from "@/clinic/types";
import { PageHeader } from "@/components/common/page-header";
import { LoadingState } from "@/components/feedback/states";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { ApiError, tenantApiRequest } from "@/lib/api/client";
import { mapApiFieldErrors } from "@/lib/api/errors";
import {
  createTelephonyNumber,
  getTelephonyNumber,
  telephonyKeys,
  updateTelephonyNumber,
} from "@/telephony/api";
import type { TelephonyNumberInput } from "@/telephony/types";
import { useTenant } from "@/tenancy/tenant-provider";
import {
  TelephonyForm,
  type TelephonyFormErrors,
  validateTelephonyForm,
} from "./telephony-form";

const initial: TelephonyNumberInput = {
  provider: "TWILIO",
  phoneNumber: "",
  locationId: null,
  providerPhoneNumberId: null,
};
const fields = [
  "provider",
  "phoneNumber",
  "locationId",
  "providerPhoneNumberId",
] as const;
export function TelephonyEditor({
  telephonyNumberId,
}: {
  telephonyNumberId?: string;
}) {
  const tenant = useTenant();
  const tenantId = tenant.currentTenant?.id ?? "";
  const router = useRouter();
  const client = useQueryClient();
  const [form, setForm] = useState(initial);
  const [scope, setScope] = useState<"ALL" | "LOCATION">("ALL");
  const [errors, setErrors] = useState<TelephonyFormErrors>({});
  const [saveError, setSaveError] = useState<string>();
  const detail = useQuery({
    queryKey: telephonyKeys.detail(tenantId, telephonyNumberId ?? "new"),
    queryFn: () => getTelephonyNumber(tenantId, telephonyNumberId!),
    enabled: Boolean(telephonyNumberId && tenantId),
    meta: { tenantScoped: true },
  });
  const locations = useQuery({
    queryKey: telephonyKeys.locations(tenantId),
    queryFn: () =>
      tenantApiRequest<Paginated<Location>>(
        "/locations?page=1&limit=100",
        tenantId,
      ),
    enabled: Boolean(tenantId),
    meta: { tenantScoped: true },
  });
  useEffect(() => {
    if (detail.data) {
      setForm({
        provider: detail.data.provider,
        phoneNumber: detail.data.phoneNumber,
        locationId: detail.data.locationId,
        providerPhoneNumberId: detail.data.providerPhoneNumberId,
      });
      setScope(detail.data.locationId ? "LOCATION" : "ALL");
    }
  }, [detail.data]);
  const mutation = useMutation({
    mutationFn: () =>
      telephonyNumberId
        ? updateTelephonyNumber(tenantId, telephonyNumberId, form)
        : createTelephonyNumber(tenantId, form),
    onSuccess: async (item) => {
      client.setQueryData(telephonyKeys.detail(tenantId, item.id), item);
      await client.invalidateQueries({ queryKey: telephonyKeys.all(tenantId) });
      router.push(`/telephony/${item.id}`);
    },
    onError: (error) => {
      const mapped = mapApiFieldErrors(error, fields);
      if (error instanceof ApiError && error.status === 409)
        mapped.phoneNumber = "This phone number is already configured.";
      if (Object.keys(mapped).length) setErrors(mapped);
      else setSaveError("Unable to save the phone number. Please try again.");
    },
  });
  function submit() {
    const next = validateTelephonyForm(form, scope);
    setErrors(next);
    setSaveError(undefined);
    if (!Object.keys(next).length && !mutation.isPending) mutation.mutate();
  }
  if ((telephonyNumberId && detail.isLoading) || locations.isLoading)
    return (
      <AppShell>
        <LoadingState />
      </AppShell>
    );
  if ((telephonyNumberId && detail.isError) || locations.isError)
    return (
      <AppShell>
        <div className="p-8 text-center">
          <h1 className="font-semibold">
            {telephonyNumberId
              ? "Unable to Load Phone Number"
              : "Unable to Load Locations"}
          </h1>
        </div>
      </AppShell>
    );
  return (
    <AppShell>
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link
            href={
              telephonyNumberId
                ? `/telephony/${telephonyNumberId}`
                : "/telephony"
            }
          >
            <ArrowLeft />
            {telephonyNumberId ? "Back to Phone Number" : "Back to Telephony"}
          </Link>
        </Button>
        <PageHeader
          title={telephonyNumberId ? "Edit Phone Number" : "Add Phone Number"}
          description={
            telephonyNumberId
              ? "Update the inbound phone number configuration."
              : "Configure an inbound phone number for future AI voice routing."
          }
        />
        {saveError && (
          <div
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {saveError}
          </div>
        )}
        <TelephonyForm
          mode={telephonyNumberId ? "edit" : "create"}
          value={form}
          scope={scope}
          locations={locations.data?.data ?? []}
          errors={errors}
          isSubmitting={mutation.isPending}
          onChange={(next) => {
            setForm(next);
            setErrors({});
            setSaveError(undefined);
          }}
          onScopeChange={(next) => {
            setScope(next);
            setForm((old) => ({
              ...old,
              locationId: next === "ALL" ? null : old.locationId,
            }));
            setErrors({});
          }}
          onSubmit={submit}
          cancelHref={
            telephonyNumberId ? `/telephony/${telephonyNumberId}` : "/telephony"
          }
        />
      </div>
    </AppShell>
  );
}
