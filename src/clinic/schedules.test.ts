import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/client";
import {
  DraftPeriod,
  locationHoursConflictMessage,
  scheduleApiErrors,
  toPayload,
  validateSchedule,
} from "./schedules";
import { ProviderScheduleLocation } from "./types";

const location: ProviderScheduleLocation = {
  id: "l1",
  name: "Main",
  timezone: "America/New_York",
  status: "ACTIVE",
  businessHours: [
    {
      id: "h1",
      dayOfWeek: "MONDAY",
      isClosed: false,
      openTime: "09:00",
      closeTime: "17:00",
    },
    {
      id: "h2",
      dayOfWeek: "TUESDAY",
      isClosed: true,
      openTime: null,
      closeTime: null,
    },
  ],
  periods: [],
};
const period = (
  key: string,
  startTime: string,
  endTime: string,
  isActive = true,
): DraftPeriod => ({ key, dayOfWeek: "MONDAY", startTime, endTime, isActive });

describe("provider schedule validation", () => {
  it("accepts valid and adjacent active periods", () => {
    expect(
      validateSchedule(location, [
        period("a", "09:00", "12:00"),
        period("b", "12:00", "14:00"),
      ]),
    ).toEqual({});
  });
  it.each([
    ["9:00", "12:00"],
    ["09:60", "12:00"],
    ["09:00", "24:00"],
  ])("requires strict HH:mm (%s–%s)", (start, end) => {
    expect(
      validateSchedule(location, [period("a", start, end)]).a,
    ).toBeDefined();
  });
  it.each([
    ["12:00", "12:00"],
    ["13:00", "12:00"],
  ])("rejects equal or reversed ranges", (start, end) => {
    expect(validateSchedule(location, [period("a", start, end)]).a).toContain(
      "Start time must be before end time.",
    );
  });
  it("rejects active overlap but ignores inactive overlap", () => {
    expect(
      validateSchedule(location, [
        period("a", "09:00", "12:00"),
        period("b", "11:00", "14:00"),
      ]).b[0],
    ).toMatch(/overlaps/);
    expect(
      validateSchedule(location, [
        period("a", "09:00", "12:00"),
        period("b", "11:00", "14:00", false),
      ]),
    ).toEqual({});
  });
  it("rejects outside-hours and closed-day active periods", () => {
    expect(
      validateSchedule(location, [period("a", "08:00", "12:00")]).a[0],
    ).toMatch(/09:00–17:00/);
    expect(
      validateSchedule(location, [
        { ...period("b", "09:00", "12:00"), dayOfWeek: "TUESDAY" },
      ]).b[0],
    ).toMatch(/closed/);
  });
  it("prevents active periods at an inactive location", () => {
    expect(
      validateSchedule({ ...location, status: "INACTIVE" }, [
        period("a", "09:00", "12:00"),
      ]).a[0],
    ).toMatch(/inactive location/);
  });
  it("enforces the backend maximum and strips local keys", () => {
    expect(
      validateSchedule(
        location,
        Array.from({ length: 101 }, (_, i) =>
          period(String(i), "09:00", "10:00", false),
        ),
      ).summary,
    ).toBeDefined();
    expect(toPayload([period("local", "09:07", "10:13")])).toEqual([
      {
        dayOfWeek: "MONDAY",
        startTime: "09:07",
        endTime: "10:13",
        isActive: true,
      },
    ]);
  });
});

describe("schedule conflict mapping", () => {
  it("maps every overlap conflict", () => {
    const mapped = scheduleApiErrors(
      new ApiError("failed", 400, {
        code: "PROVIDER_PERIOD_OVERLAP",
        conflicts: [
          {
            dayOfWeek: "MONDAY",
            startTime: "11:00",
            endTime: "14:00",
            conflictingStartTime: "09:00",
            conflictingEndTime: "12:00",
          },
          {
            dayOfWeek: "MONDAY",
            startTime: "13:00",
            endTime: "15:00",
            conflictingStartTime: "11:00",
            conflictingEndTime: "14:00",
          },
        ],
      }),
    );
    expect(mapped.summary).toHaveLength(2);
    expect(mapped.summary[0]).toMatch(/overlaps/);
  });
  it("maps outside-hours and location editor conflicts", () => {
    const details = {
      code: "PROVIDER_PERIOD_OUTSIDE_LOCATION_HOURS",
      conflicts: [
        {
          dayOfWeek: "MONDAY",
          startTime: "08:00",
          endTime: "12:00",
          proposedOpenTime: "09:00",
          proposedCloseTime: "17:00",
        },
      ],
    };
    expect(
      scheduleApiErrors(new ApiError("failed", 400, details)).summary[0],
    ).toMatch(/09:00–17:00/);
    const locationError = new ApiError("failed", 400, {
      code: "LOCATION_HOURS_PROVIDER_PERIOD_CONFLICT",
      conflicts: [
        {
          providerName: "Dr. Lee",
          dayOfWeek: "MONDAY",
          startTime: "09:00",
          endTime: "17:00",
        },
      ],
    });
    expect(locationHoursConflictMessage(locationError)).toMatch(
      /Dr. Lee: Monday 09:00–17:00/,
    );
  });
});
