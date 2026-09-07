"use client";
import { FormEvent, use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  AudioWaveform,
  Eye,
  EyeOff,
  Save,
  UserPlus,
} from "lucide-react";
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
import { PlatformMembership, PlatformTenant } from "@/tenancy/types";
const roles: TenantRole[] = ["CLINIC_OWNER", "CLINIC_ADMIN", "RECEPTIONIST"];
const badge = {
  ACTIVE: "success",
  SUSPENDED: "warning",
  DISABLED: "danger",
} as const;
export default function TenantDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { tenantId } = use(params);
  const query = use(searchParams);
  const client = useQueryClient();
  const [tab, setTab] = useState<"overview" | "members">("overview");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<PlatformTenant["status"]>("ACTIVE");
  const [initialized, setInitialized] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmationRequired, setConfirmationRequired] = useState(false);
  const [memberSuccess, setMemberSuccess] = useState("");
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
  const save = useMutation({
    mutationFn: () =>
      apiRequest(`/tenants/${tenantId}`, {
        method: "PATCH",
        body: JSON.stringify({ name, status }),
      }),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ["platform", "tenant", tenantId] }),
  });
  const repairProvisioning = useMutation({
    mutationFn: () =>
      apiRequest(`/tenants/${tenantId}/provisioning`, { method: "POST" }),
    onSuccess: () =>
      client.invalidateQueries({
        queryKey: ["platform", "tenant", tenantId],
      }),
  });
  const add = useMutation({
    mutationFn: () =>
      apiRequest<{
        state: "created" | "confirmation_required";
        message?: string;
      }>(`/tenants/${tenantId}/members`, {
        method: "POST",
        body: JSON.stringify({
          email: memberEmail,
          ...(firstName ? { firstName } : {}),
          ...(lastName ? { lastName } : {}),
          ...(temporaryPassword ? { temporaryPassword } : {}),
          role,
        }),
      }),
    onSuccess: async (result) => {
      if (result.state === "confirmation_required") {
        setTemporaryPassword("");
        setConfirmationRequired(true);
        setMemberSuccess("");
        return;
      }
      await memberAdded("Member created successfully.");
    },
  });
  const confirmExisting = useMutation({
    mutationFn: () =>
      apiRequest(`/tenants/${tenantId}/members/confirm-existing`, {
        method: "POST",
        body: JSON.stringify({ email: memberEmail, role }),
      }),
    onSuccess: () => memberAdded("Existing account added successfully."),
  });
  async function memberAdded(message: string) {
    setMemberEmail("");
    setFirstName("");
    setLastName("");
    setTemporaryPassword("");
    setConfirmationRequired(false);
    setMemberSuccess(message);
    await Promise.all([
      client.invalidateQueries({
        queryKey: ["platform", "tenant", tenantId],
      }),
      client.invalidateQueries({
        queryKey: ["platform", "tenant", tenantId, "members"],
      }),
    ]);
  }
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
    if (!add.isPending && !confirmExisting.isPending) add.mutate();
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
                <div className="flex items-center gap-2">
                  <Button asChild variant="outline">
                    <Link href={`/tenants/${tenantId}/voice-assistant`}>
                      <AudioWaveform />
                      Voice Assistant
                    </Link>
                  </Button>
                  <StatusBadge variant={badge[tenant.data.status]}>
                    {tenant.data.status[0] +
                      tenant.data.status.slice(1).toLowerCase()}
                  </StatusBadge>
                </div>
              }
            />
            {query.created === "1" && (
              <Card className="border-success/40 bg-success/5">
                <CardContent className="p-4 text-sm">
                  Tenant created successfully. Baseline provisioning completed;
                  the Voice Assistant channel was created disabled.
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader>
                <CardTitle>Setup readiness</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!tenant.data.provisioning ? (
                  <div className="space-y-3">
                    <p className="text-sm text-warning">
                      Baseline provisioning is missing. Repair it before
                      configuring this tenant.
                    </p>
                    <Button
                      size="sm"
                      loading={repairProvisioning.isPending}
                      onClick={() => repairProvisioning.mutate()}
                    >
                      Repair baseline provisioning
                    </Button>
                    {repairProvisioning.error && (
                      <p className="text-sm text-destructive">
                        {repairProvisioning.error.message}
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      {tenant.data.provisioning.readiness.state
                        .toLowerCase()
                        .replaceAll("_", " ")}
                    </p>
                    <div className="grid gap-2 md:grid-cols-2">
                      {tenant.data.provisioning.readiness.required.map(
                        (item) => (
                          <div key={item.key} className="text-sm">
                            {item.complete ? "✓" : "○"} {item.label}
                          </div>
                        ),
                      )}
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/tenants/${tenantId}/voice-assistant`}>
                        <AudioWaveform /> Configure Voice Assistant
                      </Link>
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
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
                        description="Create a new account or add an existing CareFlow account to this tenant."
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
                    <CardTitle>Create or Add Member</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={addMember} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="member-email">Email *</Label>
                        <Input
                          id="member-email"
                          type="email"
                          required
                          value={memberEmail}
                          onChange={(event) => {
                            setMemberEmail(event.target.value);
                            setConfirmationRequired(false);
                            setMemberSuccess("");
                          }}
                          placeholder="member@example.com"
                          autoComplete="off"
                        />
                      </div>
                      {!confirmationRequired && (
                        <>
                          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                            <div className="space-y-2">
                              <Label htmlFor="member-first-name">
                                First Name (required for a new account)
                              </Label>
                              <Input
                                id="member-first-name"
                                value={firstName}
                                onChange={(event) =>
                                  setFirstName(event.target.value)
                                }
                                autoComplete="off"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="member-last-name">
                                Last Name (required for a new account)
                              </Label>
                              <Input
                                id="member-last-name"
                                value={lastName}
                                onChange={(event) =>
                                  setLastName(event.target.value)
                                }
                                autoComplete="off"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="temporary-password">
                              Temporary Password (required for a new account)
                            </Label>
                            <div className="relative">
                              <Input
                                id="temporary-password"
                                type={showPassword ? "text" : "password"}
                                minLength={12}
                                value={temporaryPassword}
                                onChange={(event) =>
                                  setTemporaryPassword(event.target.value)
                                }
                                className="pr-10"
                                autoComplete="new-password"
                              />
                              <button
                                type="button"
                                aria-label={
                                  showPassword
                                    ? "Hide temporary password"
                                    : "Show temporary password"
                                }
                                onClick={() =>
                                  setShowPassword((value) => !value)
                                }
                                className="absolute right-3 top-2.5 text-muted-foreground"
                              >
                                {showPassword ? (
                                  <EyeOff className="size-4" />
                                ) : (
                                  <Eye className="size-4" />
                                )}
                              </button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Used only if this email is not registered. Minimum
                              12 characters.
                            </p>
                          </div>
                        </>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="role">Tenant Role</Label>
                        <select
                          id="role"
                          value={role}
                          onChange={(event) => {
                            setRole(event.target.value as TenantRole);
                            setConfirmationRequired(false);
                          }}
                          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                        >
                          {roles.map((value) => (
                            <option key={value} value={value}>
                              {tenantRoleLabel(value)}
                            </option>
                          ))}
                        </select>
                      </div>
                      {confirmationRequired && (
                        <div
                          role="status"
                          className="space-y-3 rounded-md border border-warning/40 bg-warning/5 p-3 text-sm"
                        >
                          <p>
                            This email belongs to an existing CareFlow account.
                            Confirm that you want to add the account to this
                            tenant. The account’s profile and password will not
                            be changed.
                          </p>
                          <Button
                            type="button"
                            className="w-full"
                            loading={confirmExisting.isPending}
                            disabled={add.isPending}
                            onClick={() => confirmExisting.mutate()}
                          >
                            <UserPlus /> Add Existing Account
                          </Button>
                        </div>
                      )}
                      {(add.error || confirmExisting.error) && (
                        <p className="text-sm text-destructive">
                          {(add.error || confirmExisting.error)?.message}
                        </p>
                      )}
                      {memberSuccess && (
                        <p role="status" className="text-sm text-success">
                          {memberSuccess}
                        </p>
                      )}
                      {!confirmationRequired && (
                        <Button
                          className="w-full"
                          disabled={confirmExisting.isPending}
                          loading={add.isPending}
                        >
                          <UserPlus />
                          Create Member
                        </Button>
                      )}
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
