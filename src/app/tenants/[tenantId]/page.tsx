"use client";
import { FormEvent, use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Search, UserPlus } from "lucide-react";
import Link from "next/link";
import { apiRequest } from "@/lib/api/client";
import { tenantRoleLabel, TenantRole } from "@/auth/types";
import { AppShell } from "@/components/layout/app-shell";
import { PlatformGate } from "@/components/auth/platform-gate";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/feedback/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlatformMembership, PlatformTenant, SafeUser } from "@/tenancy/types";
const roles: TenantRole[] = ["CLINIC_OWNER", "CLINIC_ADMIN", "RECEPTIONIST"];
const badge = {
  ACTIVE: "success",
  SUSPENDED: "warning",
  DISABLED: "danger",
} as const;
export default function TenantDetailPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = use(params);
  const client = useQueryClient();
  const [tab, setTab] = useState<"overview" | "members">("overview");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<PlatformTenant["status"]>("ACTIVE");
  const [initialized, setInitialized] = useState(false);
  const [lookup, setLookup] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [role, setRole] = useState<TenantRole>("RECEPTIONIST");
  const tenant = useQuery({
    queryKey: ["platform", "tenant", tenantId],
    queryFn: async () => {
      const data = await apiRequest<PlatformTenant>(`/tenants/${tenantId}`);
      if (!initialized) {
        setName(data.name);
        setStatus(data.status);
        setInitialized(true);
      }
      return data;
    },
  });
  const members = useQuery({
    queryKey: ["platform", "tenant", tenantId, "members"],
    queryFn: () =>
      apiRequest<PlatformMembership[]>(`/tenants/${tenantId}/members`),
    enabled: tab === "members",
  });
  const users = useQuery({
    queryKey: ["platform", "users", lookup],
    queryFn: () =>
      apiRequest<SafeUser[]>(
        `/users/search?query=${encodeURIComponent(lookup)}`,
      ),
    enabled: lookup.trim().length >= 2,
  });
  const save = useMutation({
    mutationFn: () =>
      apiRequest(`/tenants/${tenantId}`, {
        method: "PATCH",
        body: JSON.stringify({ name, status }),
      }),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ["platform", "tenant", tenantId] }),
  });
  const add = useMutation({
    mutationFn: () =>
      apiRequest(`/tenants/${tenantId}/members`, {
        method: "POST",
        body: JSON.stringify({ userId: selectedUser, role }),
      }),
    onSuccess: async () => {
      setSelectedUser("");
      setLookup("");
      await client.invalidateQueries({
        queryKey: ["platform", "tenant", tenantId],
      });
    },
  });
  const updateMember = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) =>
      apiRequest(`/tenants/${tenantId}/members/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ["platform", "tenant", tenantId] }),
  });
  function addMember(event: FormEvent) {
    event.preventDefault();
    if (selectedUser) add.mutate();
  }
  return (
    <AppShell>
      <PlatformGate>
        {tenant.isLoading ? (
          <LoadingState />
        ) : tenant.isError || !tenant.data ? (
          <ErrorState />
        ) : (
          <div className="space-y-6">
            <div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/tenants">
                  <ArrowLeft />
                  Back to Tenants
                </Link>
              </Button>
            </div>
            <PageHeader
              title={tenant.data.name}
              description={tenant.data.slug}
              actions={
                <StatusBadge variant={badge[tenant.data.status]}>
                  {tenant.data.status[0] +
                    tenant.data.status.slice(1).toLowerCase()}
                </StatusBadge>
              }
            />
            <div className="flex gap-1 border-b">
              <Button
                variant={tab === "overview" ? "secondary" : "ghost"}
                onClick={() => setTab("overview")}
              >
                Overview
              </Button>
              <Button
                variant={tab === "members" ? "secondary" : "ghost"}
                onClick={() => setTab("members")}
              >
                Members ({tenant.data.memberCount ?? 0})
              </Button>
            </div>
            {tab === "overview" ? (
              <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                <Card>
                  <CardHeader>
                    <CardTitle>Tenant Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Tenant Name</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        maxLength={120}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="slug">Tenant Slug</Label>
                      <Input id="slug" value={tenant.data.slug} disabled />
                      <p className="text-xs text-muted-foreground">
                        Slugs are immutable in Stage 1.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <select
                        id="status"
                        value={status}
                        onChange={(event) =>
                          setStatus(
                            event.target.value as PlatformTenant["status"],
                          )
                        }
                        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="SUSPENDED">Suspended</option>
                        <option value="DISABLED">Disabled</option>
                      </select>
                      {status !== tenant.data.status && status !== "ACTIVE" && (
                        <p className="text-sm text-warning">
                          This change prevents normal members from accessing the
                          clinic.
                        </p>
                      )}
                    </div>
                    {save.error && (
                      <p className="text-sm text-destructive">
                        {save.error.message}
                      </p>
                    )}
                    <Button
                      loading={save.isPending}
                      onClick={() => save.mutate()}
                    >
                      <Save />
                      Save Changes
                    </Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Tenant Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Created Date</p>
                      <p className="font-medium">
                        {new Date(tenant.data.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Member Count</p>
                      <p className="font-medium">{tenant.data.memberCount}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
                <Card>
                  <CardHeader>
                    <CardTitle>Members</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {members.isLoading ? (
                      <LoadingState />
                    ) : members.isError ? (
                      <ErrorState />
                    ) : !members.data?.length ? (
                      <EmptyState
                        title="No Members"
                        description="Add an existing application user to this tenant."
                      />
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] text-left text-sm">
                          <thead className="border-y bg-muted/60 text-xs text-muted-foreground">
                            <tr>
                              <th className="px-4 py-3">Name</th>
                              <th className="px-4 py-3">Email</th>
                              <th className="px-4 py-3">Tenant Role</th>
                              <th className="px-4 py-3">Status</th>
                              <th className="px-4 py-3">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {members.data.map((member) => (
                              <tr
                                key={member.id}
                                className="border-b last:border-0"
                              >
                                <td className="px-4 py-3 font-medium">
                                  {member.user.firstName} {member.user.lastName}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">
                                  {member.user.email}
                                </td>
                                <td className="px-4 py-3">
                                  <select
                                    aria-label={`Role for ${member.user.email}`}
                                    value={member.role}
                                    onChange={(event) =>
                                      updateMember.mutate({
                                        id: member.id,
                                        data: { role: event.target.value },
                                      })
                                    }
                                    className="rounded-md border bg-background p-2"
                                  >
                                    {roles.map((value) => (
                                      <option key={value} value={value}>
                                        {tenantRoleLabel(value)}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-4 py-3">
                                  <StatusBadge variant={badge[member.status]}>
                                    {member.status[0] +
                                      member.status.slice(1).toLowerCase()}
                                  </StatusBadge>
                                </td>
                                <td className="px-4 py-3">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      updateMember.mutate({
                                        id: member.id,
                                        data: {
                                          status:
                                            member.status === "ACTIVE"
                                              ? "SUSPENDED"
                                              : "ACTIVE",
                                        },
                                      })
                                    }
                                  >
                                    {member.status === "ACTIVE"
                                      ? "Suspend"
                                      : "Reactivate"}
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {updateMember.error && (
                      <p className="p-4 text-sm text-destructive">
                        {updateMember.error.message}
                      </p>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Add Member</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={addMember} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="user-search">Find Existing User</Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                          <Input
                            id="user-search"
                            value={lookup}
                            onChange={(event) => {
                              setLookup(event.target.value);
                              setSelectedUser("");
                            }}
                            className="pl-9"
                            placeholder="Name or email"
                          />
                        </div>
                      </div>
                      {users.data && lookup.length >= 2 && (
                        <div className="max-h-40 overflow-auto rounded-md border">
                          {users.data.length ? (
                            users.data.map((user) => (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedUser(user.id);
                                  setLookup(
                                    `${user.firstName} ${user.lastName} (${user.email})`,
                                  );
                                }}
                                key={user.id}
                                className={`block w-full border-b p-2 text-left text-sm last:border-0 hover:bg-muted ${selectedUser === user.id ? "bg-accent" : ""}`}
                              >
                                <span className="font-medium">
                                  {user.firstName} {user.lastName}
                                </span>
                                <br />
                                <span className="text-xs text-muted-foreground">
                                  {user.email} · {user.status}
                                </span>
                              </button>
                            ))
                          ) : (
                            <p className="p-3 text-sm text-muted-foreground">
                              No users found.
                            </p>
                          )}
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="role">Tenant Role</Label>
                        <select
                          id="role"
                          value={role}
                          onChange={(event) =>
                            setRole(event.target.value as TenantRole)
                          }
                          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                        >
                          {roles.map((value) => (
                            <option key={value} value={value}>
                              {tenantRoleLabel(value)}
                            </option>
                          ))}
                        </select>
                      </div>
                      {add.error && (
                        <p className="text-sm text-destructive">
                          {add.error.message}
                        </p>
                      )}
                      <Button
                        className="w-full"
                        disabled={!selectedUser}
                        loading={add.isPending}
                      >
                        <UserPlus />
                        Add Member
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </PlatformGate>
    </AppShell>
  );
}
