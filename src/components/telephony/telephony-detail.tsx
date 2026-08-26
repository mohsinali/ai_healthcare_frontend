"use client";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Power } from "lucide-react";
import { canManage } from "@/clinic/types";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { LoadingState } from "@/components/feedback/states";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/lib/api/client";
import {
  getTelephonyNumber,
  telephonyKeys,
  updateTelephonyNumberStatus,
} from "@/telephony/api";
import { formatPhoneNumber } from "@/telephony/format";
import { useTenant } from "@/tenancy/tenant-provider";

export function TelephonyDetail({
  telephonyNumberId,
}: {
  telephonyNumberId: string;
}) {
  const tenant = useTenant();
  const tenantId = tenant.currentTenant?.id ?? "";
  const editable = canManage(tenant.tenantRole);
  const client = useQueryClient();
  const query = useQuery({
    queryKey: telephonyKeys.detail(tenantId, telephonyNumberId),
    queryFn: () => getTelephonyNumber(tenantId, telephonyNumberId),
    enabled: Boolean(tenantId),
    meta: { tenantScoped: true },
  });
  const mutation = useMutation({
    mutationFn: (status: "ACTIVE" | "INACTIVE") =>
      updateTelephonyNumberStatus(tenantId, telephonyNumberId, status),
    onSuccess: async (item) => {
      client.setQueryData(
        telephonyKeys.detail(tenantId, telephonyNumberId),
        item,
      );
      await client.invalidateQueries({ queryKey: telephonyKeys.all(tenantId) });
    },
  });
  if (query.isLoading)
    return (
      <AppShell>
        <LoadingState />
      </AppShell>
    );
  if (query.isError) {
    const status = query.error instanceof ApiError ? query.error.status : 0;
    return (
      <AppShell>
        <State
          title={
            status === 404
              ? "Phone Number Not Found"
              : status === 403
                ? "Access Denied"
                : "Unable to Load Phone Number"
          }
        />
      </AppShell>
    );
  }
  const item = query.data!;
  const scope = item.location
    ? `${item.location.name}${item.location.status === "INACTIVE" ? " — Inactive" : ""}`
    : "All Locations";
  return (
    <AppShell>
      <div className="space-y-6">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <Link href="/telephony">Telephony</Link>
          <span>/</span>
          <span className="text-foreground">
            {formatPhoneNumber(item.phoneNumber)}
          </span>
        </nav>
        <PageHeader
          title={formatPhoneNumber(item.phoneNumber)}
          description="Inbound Phone Number"
          actions={
            editable ? (
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link href={`/telephony/${item.id}/edit`}>
                    <Pencil />
                    Edit Phone Number
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  disabled={mutation.isPending}
                  onClick={() => {
                    const next =
                      item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
                    if (
                      next === "ACTIVE" ||
                      window.confirm(
                        "Deactivate Phone Number? This phone number will no longer be available for future inbound call routing.",
                      )
                    )
                      mutation.mutate(next);
                  }}
                >
                  <Power />
                  {mutation.isPending
                    ? "Updating…"
                    : item.status === "ACTIVE"
                      ? "Deactivate Phone Number"
                      : "Activate Phone Number"}
                </Button>
              </div>
            ) : undefined
          }
        />
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <Detail
                label="Phone Number"
                value={formatPhoneNumber(item.phoneNumber)}
              />
              <Detail label="Provider" value="Twilio" />
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  Status
                </dt>
                <dd className="mt-1">
                  <StatusBadge
                    variant={item.status === "ACTIVE" ? "success" : "neutral"}
                  >
                    {item.status === "ACTIVE" ? "Active" : "Inactive"}
                  </StatusBadge>
                </dd>
              </div>
              <Detail
                label="Scope"
                value={item.location ? "Specific Location" : "All Locations"}
              />
              {item.location && <Detail label="Location" value={scope} />}
              <Detail
                label="Provider Reference"
                value={item.providerPhoneNumberId || "—"}
              />
              <Detail label="Created" value={formatDate(item.createdAt)} />
              <Detail label="Updated" value={formatDate(item.updatedAt)} />
            </dl>
          </CardContent>
        </Card>
        <Button asChild variant="ghost" size="sm">
          <Link href="/telephony">
            <ArrowLeft />
            Back to Telephony
          </Link>
        </Button>
      </div>
    </AppShell>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  );
}
function State({ title }: { title: string }) {
  return (
    <div className="p-8 text-center">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This phone number is not available in the current clinic.
      </p>
      <Button asChild variant="outline" className="mt-5">
        <Link href="/telephony">Back to Telephony</Link>
      </Button>
    </div>
  );
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
