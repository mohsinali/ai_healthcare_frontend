"use client";
/* eslint-disable react-hooks/set-state-in-effect -- query data initializes per-location editable drafts */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { tenantApiRequest } from "@/lib/api/client";
import { useTenant } from "@/tenancy/tenant-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/feedback/states";
import { StatusBadge } from "@/components/common/status-badge";
import {
  canManage,
  DayOfWeek,
  ProviderScheduleLocation,
  ProviderWorkingPeriod,
  WEEKDAYS,
} from "@/clinic/types";
import {
  dayLabel,
  DraftPeriod,
  PeriodErrors,
  scheduleApiErrors,
  sortPeriods,
  toDraft,
  toPayload,
  validateSchedule,
} from "@/clinic/schedules";

export const providerScheduleQueryKey = (
  tenantId: string,
  providerId: string,
) => ["provider-working-periods", tenantId, providerId] as const;

type DraftState = Record<
  string,
  {
    periods: DraftPeriod[];
    baseline: ProviderWorkingPeriod[];
    dirty: boolean;
    errors: PeriodErrors;
    success?: string;
  }
>;
let nextKey = 0;

export function ProviderSchedule({ providerId }: { providerId: string }) {
  const tenant = useTenant();
  const tenantId = tenant.currentTenant?.id ?? "";
  const editable = canManage(tenant.tenantRole);
  const qc = useQueryClient();
  const [drafts, setDrafts] = useState<DraftState>({});
  const summaries = useRef<Record<string, HTMLDivElement | null>>({});
  const query = useQuery({
    queryKey: providerScheduleQueryKey(tenantId, providerId),
    queryFn: () =>
      tenantApiRequest<ProviderScheduleLocation[]>(
        `/providers/${providerId}/working-periods`,
        tenantId,
      ),
    enabled: Boolean(tenantId),
    meta: { tenantScoped: true },
  });

  useEffect(() => {
    if (!query.data) return;
    setDrafts((current) =>
      Object.fromEntries(
        query.data!.map((location) => {
          const existing = current[location.id];
          return [
            location.id,
            existing?.dirty
              ? existing
              : {
                  periods: toDraft(location.periods),
                  baseline: location.periods,
                  dirty: false,
                  errors: {},
                  success: existing?.success,
                },
          ];
        }),
      ),
    );
  }, [query.data]);

  const save = useMutation({
    mutationFn: ({
      locationId,
      periods,
    }: {
      locationId: string;
      periods: DraftPeriod[];
    }) =>
      tenantApiRequest<ProviderWorkingPeriod[]>(
        `/providers/${providerId}/locations/${locationId}/working-periods`,
        tenantId,
        {
          method: "PUT",
          body: JSON.stringify({ periods: toPayload(periods) }),
        },
      ),
    onSuccess: async (periods, variables) => {
      setDrafts((current) => ({
        ...current,
        [variables.locationId]: {
          periods: toDraft(periods),
          baseline: periods,
          dirty: false,
          errors: {},
          success: "Schedule saved. Availability has been updated.",
        },
      }));
      qc.setQueryData<ProviderScheduleLocation[]>(
        providerScheduleQueryKey(tenantId, providerId),
        (current) =>
          current?.map((location) =>
            location.id === variables.locationId
              ? { ...location, periods }
              : location,
          ),
      );
      await Promise.all([
        qc.invalidateQueries({
          queryKey: providerScheduleQueryKey(tenantId, providerId),
        }),
        qc.invalidateQueries({
          queryKey: ["appointment-availability", tenantId],
        }),
        qc.invalidateQueries({ queryKey: ["appointment-providers", tenantId] }),
      ]);
    },
    onError: (error, variables) => {
      setDrafts((current) => ({
        ...current,
        [variables.locationId]: {
          ...current[variables.locationId],
          errors: scheduleApiErrors(
            error,
            current[variables.locationId].periods,
          ),
          success: undefined,
        },
      }));
      requestAnimationFrame(() =>
        summaries.current[variables.locationId]?.focus(),
      );
    },
  });

  const update = (
    locationId: string,
    change: (periods: DraftPeriod[]) => DraftPeriod[],
  ) =>
    setDrafts((current) => ({
      ...current,
      [locationId]: {
        ...current[locationId],
        periods: change(current[locationId].periods),
        dirty: true,
        errors: {},
        success: undefined,
      },
    }));
  const submit = (location: ProviderScheduleLocation) => {
    const draft = drafts[location.id];
    const errors = validateSchedule(location, draft.periods);
    if (Object.keys(errors).length) {
      setDrafts((current) => ({
        ...current,
        [location.id]: { ...draft, errors, success: undefined },
      }));
      requestAnimationFrame(() => summaries.current[location.id]?.focus());
      return;
    }
    save.mutate({
      locationId: location.id,
      periods: sortPeriods(draft.periods),
    });
  };

  if (query.isLoading)
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weekly Schedule</CardTitle>
        </CardHeader>
        <LoadingState />
      </Card>
    );
  if (query.isError)
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <h3 className="font-semibold">Unable to Load Provider Schedule</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            The schedule could not be loaded.
          </p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => query.refetch()}
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  if (!query.data?.length)
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weekly Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-medium">No Assigned Locations</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Assign a location to this provider before configuring a schedule.
          </p>
          {editable && (
            <Button asChild className="mt-4" variant="outline">
              <Link href={`/providers/${providerId}/edit`}>
                Assign a Location
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>
    );

  return (
    <section className="space-y-4" aria-labelledby="provider-schedule-title">
      <div>
        <h2 id="provider-schedule-title" className="text-xl font-semibold">
          Weekly Schedule
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          No active schedule means this provider will not appear in appointment
          availability.
        </p>
      </div>
      {query.data.map((location) => {
        const draft = drafts[location.id];
        if (!draft) return null;
        const pending =
          save.isPending && save.variables?.locationId === location.id;
        return (
          <Card key={location.id}>
            <CardHeader className="gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>{location.name}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Timezone:{" "}
                  <span className="font-medium text-foreground">
                    {location.timezone}
                  </span>{" "}
                  · Times below are local
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge
                  variant={location.status === "ACTIVE" ? "success" : "neutral"}
                >
                  {location.status === "ACTIVE"
                    ? "Active location"
                    : "Inactive location"}
                </StatusBadge>
                {draft.dirty && (
                  <span className="text-sm font-medium">Unsaved changes</span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {location.status === "INACTIVE" && (
                <p
                  role="note"
                  className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm"
                >
                  This location is inactive. The provider cannot receive
                  availability here. Existing periods may only be removed or
                  deactivated.
                </p>
              )}
              {draft.errors.summary && (
                <div
                  ref={(node) => {
                    summaries.current[location.id] = node;
                  }}
                  tabIndex={-1}
                  role="alert"
                  className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
                >
                  <p className="font-medium">Schedule could not be saved</p>
                  <ul className="mt-1 list-disc pl-5">
                    {draft.errors.summary.map((message) => (
                      <li key={message}>{message}</li>
                    ))}
                  </ul>
                </div>
              )}
              {draft.success && (
                <p
                  role="status"
                  className="rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300"
                >
                  {draft.success}
                </p>
              )}
              <div className="space-y-3">
                {WEEKDAYS.map((day) => (
                  <DayEditor
                    key={day}
                    day={day}
                    location={location}
                    periods={draft.periods.filter(
                      (period) => period.dayOfWeek === day,
                    )}
                    errors={draft.errors}
                    editable={editable}
                    onChange={(change) =>
                      update(location.id, (periods) => change(periods))
                    }
                  />
                ))}
              </div>
              {editable && (
                <div className="flex flex-wrap gap-2 border-t pt-4">
                  <Button
                    type="button"
                    loading={pending}
                    disabled={!draft.dirty || save.isPending}
                    onClick={() => submit(location)}
                  >
                    <Save />
                    Save {location.name} Schedule
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!draft.dirty || pending}
                    onClick={() =>
                      setDrafts((current) => ({
                        ...current,
                        [location.id]: {
                          periods: toDraft(draft.baseline),
                          baseline: draft.baseline,
                          dirty: false,
                          errors: {},
                        },
                      }))
                    }
                  >
                    <RotateCcw />
                    Cancel Changes
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={!draft.periods.length || pending}
                    onClick={() => update(location.id, () => [])}
                  >
                    <Trash2 />
                    Clear Schedule
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}

function DayEditor({
  day,
  location,
  periods,
  errors,
  editable,
  onChange,
}: {
  day: DayOfWeek;
  location: ProviderScheduleLocation;
  periods: DraftPeriod[];
  errors: PeriodErrors;
  editable: boolean;
  onChange: (change: (all: DraftPeriod[]) => DraftPeriod[]) => void;
}) {
  const hour = location.businessHours.find((item) => item.dayOfWeek === day);
  const hours =
    !hour || hour.isClosed || !hour.openTime || !hour.closeTime
      ? "Closed"
      : `${hour.openTime}–${hour.closeTime}`;
  const ordered = sortPeriods(periods);
  const alter = (key: string, values: Partial<DraftPeriod>) =>
    onChange((all) =>
      all.map((period) =>
        period.key === key ? { ...period, ...values } : period,
      ),
    );
  return (
    <fieldset className="rounded-md border p-3">
      <legend className="px-1 text-sm font-semibold">{dayLabel(day)}</legend>
      <p className="mb-3 text-xs text-muted-foreground">
        Location hours: {hours}
      </p>
      {!ordered.length ? (
        <p className="mb-3 text-sm text-muted-foreground">Not scheduled</p>
      ) : (
        <div className="space-y-3">
          {ordered.map((period, index) => {
            const id = `${location.id}-${period.key}`;
            const disabledTimes = !editable || location.status === "INACTIVE";
            return (
              <div
                key={period.key}
                className={`rounded-md border p-3 ${period.isActive ? "" : "bg-muted/50"}`}
              >
                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
                  <div className="space-y-1">
                    <Label htmlFor={`${id}-start`}>
                      Start time, {dayLabel(day)} period {index + 1}
                    </Label>
                    <Input
                      id={`${id}-start`}
                      type="time"
                      step={900}
                      disabled={disabledTimes}
                      value={period.startTime}
                      aria-invalid={Boolean(errors[period.key])}
                      aria-describedby={
                        errors[period.key] ? `${id}-error` : undefined
                      }
                      onChange={(event) =>
                        alter(period.key, { startTime: event.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`${id}-end`}>
                      End time, {dayLabel(day)} period {index + 1}
                    </Label>
                    <Input
                      id={`${id}-end`}
                      type="time"
                      step={900}
                      disabled={disabledTimes}
                      value={period.endTime}
                      aria-invalid={Boolean(errors[period.key])}
                      aria-describedby={
                        errors[period.key] ? `${id}-error` : undefined
                      }
                      onChange={(event) =>
                        alter(period.key, { endTime: event.target.value })
                      }
                    />
                  </div>
                  <label className="flex min-h-10 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={period.isActive}
                      disabled={
                        !editable ||
                        (location.status === "INACTIVE" && !period.isActive)
                      }
                      aria-label={`${period.isActive ? "Deactivate" : "Activate"} ${dayLabel(day)} period ${index + 1}`}
                      onChange={(event) =>
                        alter(period.key, { isActive: event.target.checked })
                      }
                    />
                    {period.isActive ? "Active" : "Inactive"}
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={!editable}
                    aria-label={`Remove ${dayLabel(day)} period ${index + 1}`}
                    onClick={() =>
                      onChange((all) =>
                        all.filter((item) => item.key !== period.key),
                      )
                    }
                  >
                    <Trash2 />
                    Remove
                  </Button>
                </div>
                {errors[period.key] && (
                  <ul
                    id={`${id}-error`}
                    className="mt-2 list-disc pl-5 text-sm text-destructive"
                  >
                    {errors[period.key].map((message) => (
                      <li key={message}>{message}</li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
      {editable && (
        <Button
          className="mt-3"
          type="button"
          size="sm"
          variant="outline"
          disabled={location.status === "INACTIVE"}
          onClick={() =>
            onChange((all) => [
              ...all,
              {
                key: `new-${++nextKey}`,
                dayOfWeek: day,
                startTime: "09:00",
                endTime: "17:00",
                isActive: true,
              },
            ])
          }
        >
          <Plus />
          Add period for {dayLabel(day)}
        </Button>
      )}
    </fieldset>
  );
}
