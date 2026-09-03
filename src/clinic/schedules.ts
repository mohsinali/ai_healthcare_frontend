import { apiErrorBody } from "@/lib/api/errors";
import {
  DayOfWeek,
  ProviderScheduleLocation,
  ProviderWorkingPeriod,
  WEEKDAYS,
} from "./types";

export const MAX_PROVIDER_PERIODS = 100;
export type DraftPeriod = ProviderWorkingPeriod & { key: string };
export type PeriodErrors = Record<string, string[]>;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export function toDraft(periods: ProviderWorkingPeriod[]): DraftPeriod[] {
  return periods.map((period, index) => ({
    ...period,
    key: `server-${index}`,
  }));
}

export function toPayload(periods: DraftPeriod[]): ProviderWorkingPeriod[] {
  return periods.map((period) => ({
    dayOfWeek: period.dayOfWeek,
    startTime: period.startTime,
    endTime: period.endTime,
    isActive: period.isActive,
  }));
}

export function sortPeriods<T extends ProviderWorkingPeriod>(
  periods: T[],
): T[] {
  return [...periods].sort(
    (a, b) =>
      WEEKDAYS.indexOf(a.dayOfWeek) - WEEKDAYS.indexOf(b.dayOfWeek) ||
      a.startTime.localeCompare(b.startTime) ||
      a.endTime.localeCompare(b.endTime),
  );
}

export function validateSchedule(
  location: ProviderScheduleLocation,
  periods: DraftPeriod[],
): PeriodErrors {
  const errors: PeriodErrors = {};
  const add = (key: string, message: string) => {
    errors[key] = [...(errors[key] ?? []), message];
  };
  if (periods.length > MAX_PROVIDER_PERIODS)
    add(
      "summary",
      `A schedule can contain at most ${MAX_PROVIDER_PERIODS} periods.`,
    );

  for (const period of periods) {
    if (!WEEKDAYS.includes(period.dayOfWeek))
      add(period.key, "Select a valid weekday.");
    if (!TIME.test(period.startTime))
      add(period.key, "Enter a valid start time in HH:mm format.");
    if (!TIME.test(period.endTime))
      add(period.key, "Enter a valid end time in HH:mm format.");
    if (
      TIME.test(period.startTime) &&
      TIME.test(period.endTime) &&
      period.startTime >= period.endTime
    )
      add(period.key, "Start time must be before end time.");
    if (!period.isActive) continue;
    if (location.status !== "ACTIVE") {
      add(
        period.key,
        "Active periods are not allowed at an inactive location.",
      );
      continue;
    }
    const hour = location.businessHours.find(
      (item) => item.dayOfWeek === period.dayOfWeek,
    );
    if (!hour || hour.isClosed || !hour.openTime || !hour.closeTime)
      add(
        period.key,
        `${dayLabel(period.dayOfWeek)} is closed at this location.`,
      );
    else if (
      TIME.test(period.startTime) &&
      TIME.test(period.endTime) &&
      (period.startTime < hour.openTime || period.endTime > hour.closeTime)
    )
      add(
        period.key,
        `This period must remain within the location's ${dayLabel(period.dayOfWeek)} hours, ${hour.openTime}–${hour.closeTime}.`,
      );
  }

  for (const day of WEEKDAYS) {
    const active = sortPeriods(
      periods.filter((item) => item.dayOfWeek === day && item.isActive),
    );
    for (let index = 1; index < active.length; index++) {
      if (
        TIME.test(active[index].startTime) &&
        TIME.test(active[index - 1].endTime) &&
        active[index].startTime < active[index - 1].endTime
      ) {
        add(
          active[index - 1].key,
          `This period overlaps another ${dayLabel(day)} period.`,
        );
        add(
          active[index].key,
          `This period overlaps another ${dayLabel(day)} period.`,
        );
      }
    }
  }
  return errors;
}

interface Conflict {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  conflictingStartTime?: string;
  conflictingEndTime?: string;
  proposedOpenTime?: string | null;
  proposedCloseTime?: string | null;
  providerName?: string;
}
export function scheduleApiErrors(
  error: unknown,
  periods: DraftPeriod[] = [],
): PeriodErrors {
  const body = apiErrorBody(error);
  const conflicts =
    (body as typeof body & { conflicts?: Conflict[] })?.conflicts ?? [];
  if (!conflicts.length)
    return {
      summary: [
        body?.message && typeof body.message === "string"
          ? body.message
          : "Unable to save this schedule. Please try again.",
      ],
    };
  const mapped: PeriodErrors = { summary: [] };
  for (const conflict of conflicts) {
    let message: string;
    if (body?.code === "PROVIDER_PERIOD_OVERLAP")
      message = `${dayLabel(conflict.dayOfWeek)} ${conflict.startTime}–${conflict.endTime} overlaps ${conflict.conflictingStartTime}–${conflict.conflictingEndTime}.`;
    else if (body?.code === "PROVIDER_PERIOD_OUTSIDE_LOCATION_HOURS") {
      const hours =
        conflict.proposedOpenTime && conflict.proposedCloseTime
          ? `${conflict.proposedOpenTime}–${conflict.proposedCloseTime}`
          : "Closed";
      message = `${dayLabel(conflict.dayOfWeek)} ${conflict.startTime}–${conflict.endTime} must remain within location hours (${hours}).`;
    } else
      message =
        "The schedule could not be saved. Please review the periods and try again.";
    mapped.summary.push(message);
    const period = periods.find(
      (item) =>
        item.dayOfWeek === conflict.dayOfWeek &&
        item.startTime === conflict.startTime &&
        item.endTime === conflict.endTime,
    );
    if (period) mapped[period.key] = [...(mapped[period.key] ?? []), message];
  }
  return mapped;
}

export function locationHoursConflictMessage(
  error: unknown,
): string | undefined {
  const body = apiErrorBody(error);
  if (body?.code !== "LOCATION_HOURS_PROVIDER_PERIOD_CONFLICT")
    return undefined;
  const conflicts =
    (body as typeof body & { conflicts?: Conflict[] }).conflicts ?? [];
  if (!conflicts.length)
    return "Location hours cannot be reduced because existing provider schedules would fall outside them.";
  return [
    "Location hours cannot be reduced because existing provider schedules would fall outside them:",
    ...conflicts.map(
      (conflict) =>
        `${conflict.providerName || "Provider"}: ${dayLabel(conflict.dayOfWeek)} ${conflict.startTime}–${conflict.endTime}.`,
    ),
  ].join("\n");
}

export function dayLabel(day: DayOfWeek) {
  return day[0] + day.slice(1).toLowerCase();
}
