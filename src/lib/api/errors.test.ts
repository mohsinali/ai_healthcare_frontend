import { describe, expect, it } from "vitest";
import { ApiError } from "./client";
import { mapApiFieldErrors } from "./errors";

describe("mapApiFieldErrors", () => {
  it("maps recognized fields and ignores unknown fields", () => {
    const error = new ApiError("Validation failed.", 400, {
      errors: [
        { field: "phone", message: "Bad phone" },
        { field: "email", message: "Bad email" },
        { field: "internal", message: "Hidden" },
      ],
    });
    expect(mapApiFieldErrors(error, ["phone", "email"] as const)).toEqual({
      phone: "Bad phone",
      email: "Bad email",
    });
  });
  it("returns no fields for a general error", () =>
    expect(
      mapApiFieldErrors(new ApiError("Failed", 500, {}), ["phone"] as const),
    ).toEqual({}));
});
