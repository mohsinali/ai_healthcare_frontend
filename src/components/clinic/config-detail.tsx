"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil } from "lucide-react";
import { ApiError, tenantApiRequest } from "@/lib/api/client";
import { useTenant } from "@/tenancy/tenant-provider";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { ErrorState, LoadingState } from "@/components/feedback/states";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BusinessHour,
  canManage,
  Location,
  Provider,
  Service,
} from "@/clinic/types";

type Kind = "locations" | "providers" | "services";
type Entity = Location | Provider | Service;

export function detailQueryKey(kind: Kind, tenantId: string, id: string) {
  return [kind.slice(0, -1), tenantId, id] as const;
}

export function ConfigDetail({ kind, id }: { kind: Kind; id: string }) {
  const tenant = useTenant();
  const tenantId = tenant.currentTenant?.id ?? "";
  const query = useQuery({
    queryKey: detailQueryKey(kind, tenantId, id),
    queryFn: () => tenantApiRequest<Entity>(`/${kind}/${id}`, tenantId),
    enabled: Boolean(tenantId),
    meta: { tenantScoped: true },
  });
  const singular = kind.slice(0, -1);
  const label = singular[0].toUpperCase() + singular.slice(1);

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
        <DetailMessage
          title={
            status === 404
              ? `${label} Not Found`
              : status === 403
                ? "Access Denied"
                : `Unable to Load ${label}`
          }
          description={
            status === 404
              ? `This ${singular} does not exist or is not available in the current clinic.`
              : status === 403
                ? `You do not have permission to view this ${singular}.`
                : "Something went wrong while loading this information."
          }
          kind={kind}
        />
      </AppShell>
    );
  }
  if (!query.data)
    return (
      <AppShell>
        <ErrorState />
      </AppShell>
    );

  const entity = query.data;
  const name = entityName(entity);
  return (
    <AppShell>
      <div className="space-y-6">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <Link
            className="rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href={`/${kind}`}
          >
            {kind[0].toUpperCase() + kind.slice(1)}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-foreground" aria-current="page">
            {name}
          </span>
        </nav>
        <PageHeader
          title={name}
          description={
            kind === "providers"
              ? (entity as Provider).title || "Provider details"
              : `${label} details`
          }
          actions={
            canManage(tenant.tenantRole) ? (
              <Button asChild>
                <Link href={`/${kind}/${id}/edit`}>
                  <Pencil />
                  Edit {label}
                </Link>
              </Button>
            ) : undefined
          }
        />
        <div className="flex items-center gap-3">
          <StatusBadge
            variant={entity.status === "ACTIVE" ? "success" : "neutral"}
          >
            {entity.status === "ACTIVE" ? "Active" : "Inactive"}
          </StatusBadge>
        </div>
        {kind === "locations" ? (
          <LocationDetail value={entity as Location} />
        ) : kind === "providers" ? (
          <ProviderDetail value={entity as Provider} />
        ) : (
          <ServiceDetail value={entity as Service} />
        )}
        <Button asChild variant="ghost" size="sm">
          <Link href={`/${kind}`}>
            <ArrowLeft />
            Back to {kind[0].toUpperCase() + kind.slice(1)}
          </Link>
        </Button>
      </div>
    </AppShell>
  );
}

function LocationDetail({ value }: { value: Location }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title="Contact Information">
        <Details
          rows={[
            ["Phone", value.phone],
            ["Email", value.email],
          ]}
        />
      </Section>
      <Section title="Address">
        <Details
          rows={[
            ["Address Line 1", value.addressLine1],
            ["Address Line 2", value.addressLine2],
            ["City", value.city],
            ["State / Province", value.stateProvince],
            ["Postal Code", value.postalCode],
            ["Country", value.countryCode],
          ]}
        />
      </Section>
      <Section title="Clinic Settings">
        <Details
          rows={[
            ["Timezone", value.timezone],
            ["Escalation Phone Number", value.escalationPhoneNumber],
          ]}
        />
      </Section>
      <Section title="Business Hours">
        <BusinessHours hours={value.businessHours ?? []} />
      </Section>
      <Section title="Assigned Providers">
        <Related
          items={value.providers ?? []}
          kind="providers"
          empty="No Providers Assigned"
        />
      </Section>
      <Section title="Assigned Services">
        <Related
          items={value.services ?? []}
          kind="services"
          empty="No Services Assigned"
        />
      </Section>
      <Metadata value={value} />
    </div>
  );
}

function ProviderDetail({ value }: { value: Provider }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title="Provider Information">
        <Details
          rows={[
            ["Display Name", value.displayName],
            ["First Name", value.firstName],
            ["Last Name", value.lastName],
            ["Title", value.title],
          ]}
        />
      </Section>
      <Section title="Contact Information">
        <Details
          rows={[
            ["Email", value.email],
            ["Phone", value.phone],
          ]}
        />
      </Section>
      <Section title="Assigned Locations">
        <Related
          items={value.locations ?? []}
          kind="locations"
          empty="No Locations Assigned"
        />
      </Section>
      <Section title="Assigned Services">
        <Related
          items={value.services ?? []}
          kind="services"
          empty="No Services Assigned"
        />
      </Section>
      <Metadata value={value} />
    </div>
  );
}

function ServiceDetail({ value }: { value: Service }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title="Service Information">
        <Details
          rows={[
            ["Duration", `${value.durationMinutes} minutes`],
            ["Description", value.description],
          ]}
        />
      </Section>
      <Section title="Available At">
        <Related
          items={value.locations ?? []}
          kind="locations"
          empty="No Locations Assigned"
        />
      </Section>
      <Section title="Assigned Providers">
        <Related
          items={value.providers ?? []}
          kind="providers"
          empty="No Providers Assigned"
        />
      </Section>
      <Metadata value={value} />
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Details({ rows }: { rows: [string, string | null | undefined][] }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
          <dd className="mt-1 break-words text-sm">{value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

function Related({
  items,
  kind,
  empty,
}: {
  items: Entity[];
  kind: Kind;
  empty: string;
}) {
  if (!items.length)
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            className="rounded-sm text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href={`/${kind}/${item.id}`}
          >
            {entityName(item)}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function BusinessHours({ hours }: { hours: BusinessHour[] }) {
  if (!hours.length)
    return (
      <p className="text-sm text-muted-foreground">
        No Business Hours Available
      </p>
    );
  const order = [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
    "SUNDAY",
  ];
  return (
    <dl className="space-y-2">
      {[...hours]
        .sort((a, b) => order.indexOf(a.dayOfWeek) - order.indexOf(b.dayOfWeek))
        .map((hour) => (
          <div
            className="grid grid-cols-[7rem_1fr] gap-3 text-sm"
            key={hour.id || hour.dayOfWeek}
          >
            <dt className="font-medium capitalize">
              {hour.dayOfWeek.toLowerCase()}
            </dt>
            <dd className="text-muted-foreground">
              {hour.isClosed
                ? "Closed"
                : `${formatTime(hour.openTime)} – ${formatTime(hour.closeTime)}`}
            </dd>
          </div>
        ))}
    </dl>
  );
}

function Metadata({ value }: { value: Entity }) {
  if (!value.createdAt && !value.updatedAt) return null;
  return (
    <Section title="Record Information">
      <Details
        rows={[
          ["Created Date", formatDate(value.createdAt)],
          ["Updated Date", formatDate(value.updatedAt)],
        ]}
      />
    </Section>
  );
}

function DetailMessage({
  title,
  description,
  kind,
}: {
  title: string;
  description: string;
  kind: Kind;
}) {
  return (
    <div className="flex min-h-[55vh] items-center justify-center text-center">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-2 text-muted-foreground">{description}</p>
        <Button asChild className="mt-6" variant="outline">
          <Link href={`/${kind}`}>
            Back to {kind[0].toUpperCase() + kind.slice(1)}
          </Link>
        </Button>
      </div>
    </div>
  );
}

function entityName(value: Entity) {
  return "firstName" in value
    ? value.displayName || `${value.firstName} ${value.lastName}`
    : value.name;
}

export function formatTime(value: string | null) {
  if (!value) return "—";
  const [hours, minutes] = value.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function formatDate(value?: string) {
  return value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
        new Date(value),
      )
    : undefined;
}
