import { describe, expect, it } from "vitest";
import { emptyPatient } from "./types";
import { normalizeInternationalPhone, validatePatient } from "./validation";

describe("patient validation", () => {
  const valid = {
    ...emptyPatient,
    firstName: "Sarah",
    lastName: "Johnson",
    dateOfBirth: "1988-04-12",
    phone: "+1 305 555 0123",
    email: "sarah@example.com",
    countryCode: "US",
  };
  it("normalizes readable international phone formatting", () =>
    expect(normalizeInternationalPhone(valid.phone)).toBe("+13055550123"));
  it("returns multiple field errors", () =>
    expect(
      validatePatient({
        ...valid,
        firstName: "",
        phone: "3055550123",
        email: "bad",
        dateOfBirth: "2999-01-01",
      }),
    ).toMatchObject({
      firstName: expect.any(String),
      phone: "Enter a valid international phone number.",
      email: "Enter a valid email address.",
      dateOfBirth: "Date of birth cannot be in the future.",
    }));
  it("accepts a valid patient", () =>
    expect(validatePatient(valid)).toEqual({}));
});
