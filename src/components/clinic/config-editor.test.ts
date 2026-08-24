import { describe, expect, it } from "vitest";
import { payloadFor, validateEditor, validateLocation } from "./config-editor";

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

  it("returns all client-side location field errors", () => {
    expect(validateLocation({ ...locationInput, name: "", phone: "", email: "bad" })).toMatchObject({
      name: "Location Name is required.",
      phone: "Phone is required.",
      email: "Enter a valid email address.",
    });
  });

  it("rejects obvious provider phone gibberish client-side", () => {
    expect(
      validateEditor("providers", {
        firstName: "Ada",
        lastName: "Lovelace",
        phone: "abc123xyz",
      }),
    ).toEqual({ phone: "Enter a valid international phone number." });
  });
});

const locationInput = {
  name: "Main Clinic",
  phone: "+13055550123",
  email: "clinic@example.com",
  timezone: "America/New_York",
  addressLine1: "1 Main St",
  city: "Miami",
  stateProvince: "FL",
  postalCode: "33101",
  countryCode: "US",
};
