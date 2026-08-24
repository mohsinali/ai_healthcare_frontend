import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/client";
import { getFieldErrors, payloadFor } from "./config-editor";

describe("clinic configuration form validation", () => {
  it("does not send status when creating a location", () => {
    const payload = payloadFor(
      "locations",
      {
        name: "Clifton Branch",
        phone: "+923343683084",
        timezone: "Asia/Karachi",
        addressLine1: "MC 1081 Green Town",
        city: "Karachi",
        stateProvince: "Sindh",
        postalCode: "75230",
        countryCode: "PK",
        status: "ACTIVE",
      },
      false,
    );

    expect(payload).not.toHaveProperty("status");
  });

  it("sends status when updating an existing location", () => {
    expect(
      payloadFor(
        "locations",
        { name: "Main Clinic", status: "INACTIVE" },
        true,
      ),
    ).toMatchObject({ status: "INACTIVE" });
  });

  it("omits nullable optional fields when saving an existing location", () => {
    expect(
      payloadFor(
        "locations",
        {
          name: "Main Clinic",
          email: null,
          addressLine2: null,
          escalationPhoneNumber: null,
          status: "ACTIVE",
        },
        true,
      ),
    ).toEqual({ name: "Main Clinic", status: "ACTIVE" });
  });

  it("maps backend validation messages to their visible fields", () => {
    const error = new ApiError("Validation failed", 400, {
      message: ["phone must be shorter than or equal to 30 characters"],
    });

    expect(getFieldErrors(error)).toEqual({
      phone: "Phone: phone must be shorter than or equal to 30 characters",
    });
  });
});
