"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  PhoneCall,
  Plus,
  Power,
  Search,
} from "lucide-react";
import type { Location, Paginated } from "@/clinic/types";
import { canManage } from "@/clinic/types";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { EmptyState, LoadingState } from "@/components/feedback/states";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { tenantApiRequest } from "@/lib/api/client";
import {
  listTelephonyNumbers,
  telephonyKeys,
  updateTelephonyNumberStatus,
} from "@/telephony/api";
import { formatPhoneNumber } from "@/telephony/format";
import type { TelephonyNumberStatus } from "@/telephony/types";
import { useTenant } from "@/tenancy/tenant-provider";

export function TelephonyList() {
  const tenant = useTenant();
  const tenantId = tenant.currentTenant?.id ?? "";
  const editable = canManage(tenant.tenantRole);
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TelephonyNumberStatus | "">("");
  const [locationId, setLocationId] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(input.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [input]);
  const filters = {
    page,
    limit: 20,
    search: search || undefined,
    status: status || undefined,
    locationId: locationId || undefined,
  };
  const query = useQuery({
    queryKey: telephonyKeys.list(tenantId, filters),
    queryFn: () => listTelephonyNumbers(tenantId, filters),
    enabled: Boolean(tenantId),
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
  const mutation = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: TelephonyNumberStatus;
    }) => updateTelephonyNumberStatus(tenantId, id, status),
    onSuccess: async (item) => {
      client.setQueryData(telephonyKeys.detail(tenantId, item.id), item);
      await client.invalidateQueries({ queryKey: telephonyKeys.all(tenantId) });
    },
  });
  const filtered = Boolean(search || status || locationId);
  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Telephony"
          description="Manage inbound phone numbers and assign them to clinic locations for future AI voice routing."
          actions={
            editable ? (
              <Button asChild>
                <Link href="/telephony/new">
                  <Plus />
                  Add Phone Number
                </Link>
              </Button>
            ) : undefined
          }
        />
        <Card>
          <CardContent className="p-0">
            <div className="grid gap-3 border-b p-4 md:grid-cols-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Search Phone Numbers..."
                  aria-label="Search Phone Numbers"
                />
              </div>
              <Filter
                label="Status"
                value={status}
                onChange={(x) => {
                  setStatus(x as TelephonyNumberStatus | "");
                  setPage(1);
                }}
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </Filter>
              <Filter
                label="Location"
                value={locationId}
                onChange={(x) => {
                  setLocationId(x);
                  setPage(1);
                }}
              >
                <option value="">All Locations</option>
                {locations.data?.data.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </Filter>
            </div>
            {query.isLoading ? (
              <LoadingState />
            ) : query.isError ? (
              <State
                title="Unable to Load Phone Numbers"
                description="Something went wrong while loading phone number configuration."
              />
            ) : !query.data?.data.length ? (
              <EmptyState
                title={
                  filtered
                    ? "No Matching Phone Numbers"
                    : "No Phone Numbers Yet"
                }
                description={
                  filtered
                    ? "Try changing your search or filters."
                    : "Add an inbound phone number to prepare this clinic for future AI voice routing."
                }
                action={
                  !filtered && editable ? (
                    <Button asChild>
                      <Link href="/telephony/new">
                        <Plus />
                        Add Phone Number
                      </Link>
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-left text-sm">
                    <thead className="border-b bg-muted/60 text-xs text-muted-foreground">
                      <tr>
                        {[
                          "Phone Number",
                          "Provider",
                          "Scope",
                          "Provider Reference",
                          "Status",
                          "Updated",
                          "Actions",
                        ].map((x) => (
                          <th key={x} className="px-4 py-3 font-medium">
                            {x}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {query.data.data.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b last:border-0 hover:bg-muted/40"
                        >
                          <td className="px-4 py-3">
                            <Link
                              className="font-medium hover:text-primary hover:underline"
                              href={`/telephony/${item.id}`}
                            >
                              {formatPhoneNumber(item.phoneNumber)}
                            </Link>
                          </td>
                          <td className="px-4 py-3">Twilio</td>
                          <td className="px-4 py-3">
                            {item.location?.name ?? "All Locations"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {item.providerPhoneNumberId || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge
                              variant={
                                item.status === "ACTIVE" ? "success" : "neutral"
                              }
                            >
                              {item.status === "ACTIVE" ? "Active" : "Inactive"}
                            </StatusBadge>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            {formatDate(item.updatedAt)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <Button asChild variant="ghost" size="sm">
                                <Link href={`/telephony/${item.id}`}>
                                  <Eye />
                                  View
                                </Link>
                              </Button>
                              {editable && (
                                <Button asChild variant="ghost" size="sm">
                                  <Link href={`/telephony/${item.id}/edit`}>
                                    <Pencil />
                                    Edit
                                  </Link>
                                </Button>
                              )}
                              {editable && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={mutation.isPending}
                                  onClick={() => {
                                    const next =
                                      item.status === "ACTIVE"
                                        ? "INACTIVE"
                                        : "ACTIVE";
                                    if (
                                      next === "ACTIVE" ||
                                      window.confirm(
                                        "Deactivate Phone Number? This phone number will no longer be available for future inbound call routing.",
                                      )
                                    )
                                      mutation.mutate({
                                        id: item.id,
                                        status: next,
                                      });
                                  }}
                                >
                                  <Power />
                                  {item.status === "ACTIVE"
                                    ? "Deactivate"
                                    : "Activate"}
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between border-t p-4 text-sm text-muted-foreground">
                  <span>{query.data.meta.total} total</span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label="Previous page"
                      disabled={page <= 1}
                      onClick={() => setPage((x) => x - 1)}
                    >
                      <ChevronLeft />
                    </Button>
                    <span>
                      Page {page} of {Math.max(1, query.data.meta.totalPages)}
                    </span>
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label="Next page"
                      disabled={page >= query.data.meta.totalPages}
                      onClick={() => setPage((x) => x + 1)}
                    >
                      <ChevronRight />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
function Filter({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange(value: string): void;
  children: React.ReactNode;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 rounded-md border bg-background px-3 text-sm"
    >
      {children}
    </select>
  );
}
function State({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center p-6 text-center">
      <PhoneCall className="mb-3 text-muted-foreground" />
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
