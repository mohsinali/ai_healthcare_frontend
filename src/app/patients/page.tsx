"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Pencil, Plus, Users } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/feedback/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { tenantApiRequest } from "@/lib/api/client";
import { useTenant } from "@/tenancy/tenant-provider";
import {
  canEditPatient,
  dateOnly,
  PaginatedPatients,
  patientName,
} from "@/patients/types";
export default function Page() {
  const tenant = useTenant();
  const tenantId = tenant.currentTenant?.id ?? "";
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["patients", tenantId, { search, status, page }],
    queryFn: () =>
      tenantApiRequest<PaginatedPatients>(
        `/patients?page=${page}&limit=20&search=${encodeURIComponent(search)}${status ? `&status=${status}` : ""}`,
        tenantId,
      ),
    enabled: Boolean(tenantId),
    meta: { tenantScoped: true },
  });
  const editable = canEditPatient(tenant.tenantRole);
  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Patients"
          description="Manage patient contact and administrative information."
          actions={
            editable ? (
              <Button asChild>
                <Link href="/patients/new">
                  <Plus />
                  Add Patient
                </Link>
              </Button>
            ) : undefined
          }
        />
        <Card>
          <CardContent className="p-0">
            <div className="grid gap-3 border-b p-4 sm:grid-cols-[1fr_180px]">
              <Input
                aria-label="Search patients"
                placeholder="Search number, name, phone, or email"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
              <select
                aria-label="Status"
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
            {query.isLoading ? (
              <LoadingState />
            ) : query.isError ? (
              <ErrorState />
            ) : !query.data?.data.length ? (
              <EmptyState
                title="No Patients Yet"
                description="Patient records will appear here once they are added."
                action={
                  editable ? (
                    <Button asChild>
                      <Link href="/patients/new">
                        <Plus />
                        Add Patient
                      </Link>
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px] text-left text-sm">
                    <thead className="border-b bg-muted/60 text-xs text-muted-foreground">
                      <tr>
                        {[
                          "Patient Number",
                          "Patient",
                          "Date of Birth",
                          "Phone",
                          "Email",
                          "Status",
                          "Actions",
                        ].map((x) => (
                          <th className="px-4 py-3 font-medium" key={x}>
                            {x}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {query.data.data.map((p) => (
                        <tr
                          className="border-b last:border-0 hover:bg-muted/40"
                          key={p.id}
                        >
                          <td className="px-4 py-3">
                            {p.patientNumber}
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              className="inline-flex items-center gap-2 font-medium hover:text-primary hover:underline"
                              href={`/patients/${p.id}`}
                            >
                              <Users className="size-4 text-primary" />
                              {patientName(p)}
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            {dateOnly(p.dateOfBirth)}
                          </td>
                          <td className="px-4 py-3">{p.phone}</td>
                          <td className="px-4 py-3">{p.email ?? "—"}</td>
                          <td className="px-4 py-3">
                            <StatusBadge
                              variant={
                                p.status === "ACTIVE" ? "success" : "neutral"
                              }
                            >
                              {p.status === "ACTIVE" ? "Active" : "Inactive"}
                            </StatusBadge>
                          </td>
                          <td className="px-4 py-3">
                            {editable && (
                              <Button asChild variant="ghost" size="sm">
                                <Link href={`/patients/${p.id}/edit`}>
                                  <Pencil />
                                  Edit
                                </Link>
                              </Button>
                            )}
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
