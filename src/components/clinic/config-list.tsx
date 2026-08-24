"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { tenantApiRequest } from "@/lib/api/client";
import { useTenant } from "@/tenancy/tenant-provider";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/common/page-header";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/feedback/states";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { canManage, ConfigStatus, Paginated } from "@/clinic/types";
export interface ListEntity {
  id: string;
  status: ConfigStatus;
}
export function ConfigList<T extends ListEntity>({
  kind,
  title,
  description,
  columns,
  render,
}: {
  kind: "locations" | "providers" | "services";
  title: string;
  description: string;
  columns: string[];
  render: (item: T) => React.ReactNode[];
}) {
  const tenant = useTenant();
  const tenantId = tenant.currentTenant?.id ?? "";
  const [page, setPage] = useState(1);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(input);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [input]);
  const query = useQuery({
    queryKey: [kind, tenantId, { page, search, status }],
    queryFn: () =>
      tenantApiRequest<Paginated<T>>(
        `/${kind}?page=${page}&limit=20${search ? `&search=${encodeURIComponent(search)}` : ""}${status ? `&status=${status}` : ""}`,
        tenantId,
      ),
    enabled: Boolean(tenantId),
    meta: { tenantScoped: true },
  });
  const singular = title.slice(0, -1);
  const editable = canManage(tenant.tenantRole);
  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title={title}
          description={description}
          actions={
            editable ? (
              <Button asChild>
                <Link href={`/${kind}/new`}>
                  <Plus />
                  Add {singular}
                </Link>
              </Button>
            ) : undefined
          }
        />
        <Card>
          <CardContent className="p-0">
            <div className="flex flex-col gap-3 border-b p-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Search ${kind}`}
                />
              </div>
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Statuses</option>
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
                title={`No ${title} Yet`}
                description={`Add your first ${singular.toLowerCase()} to begin clinic configuration.`}
                action={
                  editable ? (
                    <Button asChild>
                      <Link href={`/${kind}/new`}>
                        <Plus />
                        Add {singular}
                      </Link>
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="border-b bg-muted/60 text-xs text-muted-foreground">
                      <tr>
                        {columns.map((x) => (
                          <th className="px-4 py-3 font-medium" key={x}>
                            {x}
                          </th>
                        ))}
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {query.data.data.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b last:border-0 hover:bg-muted/40"
                        >
                          {render(item).map((cell, index) => (
                            <td className="px-4 py-3" key={index}>
                              {cell}
                            </td>
                          ))}
                          <td className="px-4 py-3">
                            <StatusBadge
                              variant={
                                item.status === "ACTIVE" ? "success" : "neutral"
                              }
                            >
                              {item.status === "ACTIVE" ? "Active" : "Inactive"}
                            </StatusBadge>
                          </td>
                          <td className="px-4 py-3">
                            <Button asChild variant="ghost" size="sm">
                              <Link href={`/${kind}/${item.id}`}>View</Link>
                            </Button>
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
