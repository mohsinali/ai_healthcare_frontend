import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/client";
import { isAppointmentSlotConflict } from "./conflicts";

describe("appointment scheduling conflicts", () => {
  it("recognizes only the structured stale-slot conflict", () => {
    expect(
      isAppointmentSlotConflict(
        new ApiError("unavailable", 409, {
          code: "APPOINTMENT_SLOT_NO_LONGER_AVAILABLE",
          details: { reason: "PROVIDER_APPOINTMENT_CONFLICT" },
        }),
      ),
    ).toBe(true);
    expect(
      isAppointmentSlotConflict(
        new ApiError("conflict", 409, { code: "OTHER_CONFLICT" }),
      ),
    ).toBe(false);
    expect(isAppointmentSlotConflict(new Error("network"))).toBe(false);
  });
});
