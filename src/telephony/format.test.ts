import { describe, expect, it } from "vitest";
import { formatPhoneNumber, isInternationalPhone } from "./format";
import { validateTelephonyForm } from "@/components/telephony/telephony-form";

describe("telephony formatting and validation", () => {
  it("formats North American E.164 phone numbers", () =>
    expect(formatPhoneNumber("+13055551001")).toBe("+1 305 555 1001"));
  it("accepts formatted international input", () =>
    expect(isInternationalPhone("+1 305 555 1001")).toBe(true));
  it("requires a location only for specific-location scope", () => {
    const input = {
      provider: "TWILIO" as const,
      phoneNumber: "+13055551001",
      locationId: null,
      providerPhoneNumberId: null,
    };
    expect(validateTelephonyForm(input, "ALL").locationId).toBeUndefined();
    expect(validateTelephonyForm(input, "LOCATION").locationId).toBeTruthy();
  });
});
