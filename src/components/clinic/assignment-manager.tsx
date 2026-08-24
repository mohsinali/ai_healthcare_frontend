"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Search } from "lucide-react";
import { tenantApiRequest } from "@/lib/api/client";
import { useTenant } from "@/tenancy/tenant-provider";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Location, Paginated, Provider, Service } from "@/clinic/types";

type ResourceType = "locations" | "providers" | "services";
type AssignmentItem = Location | Provider | Service;

function itemLabel(item: AssignmentItem) {
  return "firstName" in item
    ? item.displayName || `${item.firstName} ${item.lastName}`
    : item.name;
}

export function AssignmentManager({ targetType, title, selected, onChange, editable }: {
  targetType: ResourceType;
  title: string;
  selected: string[];
  onChange: (ids: string[]) => void;
  editable: boolean;
}) {
  const tenant = useTenant();
  const tenantId = tenant.currentTenant?.id ?? "";
  const [search, setSearch] = useState("");
  const options = useQuery({
    queryKey: [targetType, tenantId, { assignmentOptions: true }],
    queryFn: () => tenantApiRequest<Paginated<AssignmentItem>>(
      `/${targetType}?page=1&limit=100`, tenantId,
    ),
    enabled: Boolean(tenantId),
    meta: { tenantScoped: true },
  });
  const filtered = (options.data?.data ?? []).filter((item) =>
    itemLabel(item).toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <section className="space-y-3" aria-label={title}>
      <div>
        <h3 className="font-medium">{title}</h3>
        {!editable && <p className="text-xs text-muted-foreground">Read-only access</p>}
      </div>
      {options.isLoading ? (
        <div className="space-y-2" aria-label={`Loading ${title}`}>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : options.isError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          Unable to load assignments. Please try again.
        </div>
      ) : (
        <>
          {editable && (
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)}
                className="pl-9" placeholder={`Search ${title.toLowerCase()}`} />
            </div>
          )}
          {!options.data?.data.length ? (
            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No {targetType} are available.</p>
          ) : !editable ? (
            selected.length ? (
              <div className="flex flex-wrap gap-2">
                {options.data.data.filter((item) => selected.includes(item.id)).map((item) => (
                  <span key={item.id} className="rounded-full bg-accent px-3 py-1 text-sm text-accent-foreground">{itemLabel(item)}</span>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">No assignments configured.</p>
          ) : !filtered.length ? (
            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No matching options.</p>
          ) : (
            <div className="grid max-h-64 gap-2 overflow-y-auto rounded-md border p-2 sm:grid-cols-2">
              {filtered.map((item) => {
                const checked = selected.includes(item.id);
                return (
                  <label key={item.id} className="flex cursor-pointer items-center gap-3 rounded-md p-2 text-sm hover:bg-muted">
                    <span className={`flex size-5 items-center justify-center rounded border ${checked ? "border-primary bg-primary text-primary-foreground" : "bg-background"}`}>
                      {checked && <Check className="size-3.5" />}
                    </span>
                    <input className="sr-only" type="checkbox" checked={checked}
                      onChange={() => onChange(checked ? selected.filter((id) => id !== item.id) : [...selected, item.id])} />
                    <span>{itemLabel(item)}</span>
                  </label>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}
