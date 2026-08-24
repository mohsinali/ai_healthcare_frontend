"use client";
/* eslint-disable react-hooks/set-state-in-effect -- query data initializes an editable assignment draft */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Save, Search } from "lucide-react";
import { tenantApiRequest } from "@/lib/api/client";
import { useTenant } from "@/tenancy/tenant-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Location,
  Paginated,
  Provider,
  Service,
  canManage,
} from "@/clinic/types";

type ResourceType = "locations" | "providers" | "services";
type AssignmentItem = Location | Provider | Service;

export function assignmentQueryKey(
  ownerType: ResourceType,
  tenantId: string,
  ownerId: string,
  targetType: ResourceType,
) {
  return [ownerType.slice(0, -1), tenantId, ownerId, targetType] as const;
}

export function assignmentInvalidationKeys(tenantId: string) {
  return [
    ["locations", tenantId],
    ["location", tenantId],
    ["providers", tenantId],
    ["provider", tenantId],
    ["services", tenantId],
    ["service", tenantId],
  ] as const;
}

function itemLabel(item: AssignmentItem) {
  return "firstName" in item
    ? item.displayName || `${item.firstName} ${item.lastName}`
    : item.name;
}

export function AssignmentManager({
  ownerType,
  ownerId,
  targetType,
  title,
}: {
  ownerType: ResourceType;
  ownerId: string;
  targetType: ResourceType;
  title: string;
}) {
  const tenant = useTenant();
  const tenantId = tenant.currentTenant?.id ?? "";
  const queryClient = useQueryClient();
  const editable = canManage(tenant.tenantRole);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [initializedFrom, setInitializedFrom] = useState("");
  const assignedKey = assignmentQueryKey(
    ownerType,
    tenantId,
    ownerId,
    targetType,
  );
  const assigned = useQuery({
    queryKey: assignedKey,
    queryFn: () =>
      tenantApiRequest<AssignmentItem[]>(
        `/${ownerType}/${ownerId}/${targetType}`,
        tenantId,
      ),
    enabled: Boolean(tenantId),
    meta: { tenantScoped: true },
  });
  const options = useQuery({
    queryKey: [targetType, tenantId, { assignmentOptions: true }],
    queryFn: () =>
      tenantApiRequest<Paginated<AssignmentItem>>(
        `/${targetType}?page=1&limit=100`,
        tenantId,
      ),
    enabled: Boolean(tenantId),
    meta: { tenantScoped: true },
  });
  useEffect(() => {
    if (
      assigned.data &&
      initializedFrom !== assigned.dataUpdatedAt.toString()
    ) {
      setSelected(assigned.data.map((item) => item.id));
      setInitializedFrom(assigned.dataUpdatedAt.toString());
    }
  }, [assigned.data, assigned.dataUpdatedAt, initializedFrom]);
  const mutation = useMutation({
    mutationFn: () =>
      tenantApiRequest<AssignmentItem[]>(
        `/${ownerType}/${ownerId}/${targetType}`,
        tenantId,
        { method: "PUT", body: JSON.stringify({ ids: selected }) },
      ),
    onSuccess: async (data) => {
      queryClient.setQueryData(assignedKey, data);
      await Promise.all(
        assignmentInvalidationKeys(tenantId).map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      );
    },
  });
  const assignedIds = useMemo(
    () => new Set((assigned.data ?? []).map((item) => item.id)),
    [assigned.data],
  );
  const dirty =
    selected.length !== assignedIds.size ||
    selected.some((id) => !assignedIds.has(id));
  const filtered = (options.data?.data ?? []).filter((item) =>
    itemLabel(item).toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <section className="space-y-3" aria-label={title}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-medium">{title}</h3>
          {!editable && (
            <p className="text-xs text-muted-foreground">Read-only access</p>
          )}
        </div>
        {editable && (
          <Button
            type="button"
            size="sm"
            disabled={!dirty || mutation.isPending}
            loading={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            <Save />
            Save Assignments
          </Button>
        )}
      </div>
      {assigned.isLoading || options.isLoading ? (
        <div className="space-y-2" aria-label={`Loading ${title}`}>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : assigned.isError || options.isError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          Unable to load assignments. Please try again.
        </div>
      ) : (
        <>
          {editable && (
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
                placeholder={`Search ${title.toLowerCase()}`}
              />
            </div>
          )}
          {!options.data?.data.length ? (
            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              No {targetType} are available.
            </p>
          ) : !editable ? (
            assigned.data?.length ? (
              <div className="flex flex-wrap gap-2">
                {assigned.data.map((item) => (
                  <span
                    key={item.id}
                    className="rounded-full bg-accent px-3 py-1 text-sm text-accent-foreground"
                  >
                    {itemLabel(item)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No assignments configured.
              </p>
            )
          ) : !filtered.length ? (
            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              No matching options.
            </p>
          ) : (
            <div className="grid max-h-64 gap-2 overflow-y-auto rounded-md border p-2 sm:grid-cols-2">
              {filtered.map((item) => {
                const checked = selected.includes(item.id);
                return (
                  <label
                    key={item.id}
                    className="flex cursor-pointer items-center gap-3 rounded-md p-2 text-sm hover:bg-muted"
                  >
                    <span
                      className={`flex size-5 items-center justify-center rounded border ${checked ? "border-primary bg-primary text-primary-foreground" : "bg-background"}`}
                    >
                      {checked && <Check className="size-3.5" />}
                    </span>
                    <input
                      className="sr-only"
                      type="checkbox"
                      checked={checked}
                      disabled={mutation.isPending}
                      onChange={() =>
                        setSelected((ids) =>
                          checked
                            ? ids.filter((id) => id !== item.id)
                            : [...ids, item.id],
                        )
                      }
                    />
                    <span>{itemLabel(item)}</span>
                  </label>
                );
              })}
            </div>
          )}
        </>
      )}
      {mutation.isSuccess && !dirty && (
        <p className="flex items-center gap-1 text-sm text-success">
          <Check className="size-4" />
          Assignments saved.
        </p>
      )}
      {mutation.isError && (
        <p className="text-sm text-destructive">{mutation.error.message}</p>
      )}
    </section>
  );
}
