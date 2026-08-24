import { describe, expect, it } from "vitest";
import { loginHref, safeReturnTo } from "./return-to";
describe("safe return navigation", () => {
  it.each([
    "/",
    "/locations",
    "/locations/abc",
    "/providers/xyz",
    "/services/123",
  ])("accepts internal route %s", (path) =>
    expect(safeReturnTo(path)).toBe(path),
  );
  it("preserves query strings and hashes", () =>
    expect(safeReturnTo("/providers?page=2&status=ACTIVE#results")).toBe(
      "/providers?page=2&status=ACTIVE#results",
    ));
  it.each([
    "https://malicious.example.com",
    "//malicious.example.com",
    "javascript:alert(1)",
    "/login?returnTo=/login",
  ])("rejects unsafe destination %s", (path) =>
    expect(safeReturnTo(path)).toBeNull(),
  );
  it("builds a login URL containing the exact requested route", () =>
    expect(loginHref("/providers", "?page=2&status=ACTIVE")).toBe(
      "/login?returnTo=%2Fproviders%3Fpage%3D2%26status%3DACTIVE",
    ));
});
