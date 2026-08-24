import { describe, expect, it } from "vitest";
import { TenantMembership } from "@/auth/types";
import { resolveTenantSelection } from "./tenant-provider";
const membership = (id: string): TenantMembership => ({ id: `membership-${id}`, role: "CLINIC_OWNER", status: "ACTIVE", tenant: { id, name: `Clinic ${id}`, slug: `clinic-${id}`, status: "ACTIVE" } });
describe("tenant selection", () => {
  it("automatically selects exactly one active membership", () => expect(resolveTenantSelection([membership("a")], null)).toBe("a"));
  it("requires selection when multiple memberships exist", () => expect(resolveTenantSelection([membership("a"), membership("b")], null)).toBeNull());
  it("discards a stale local tenant selection", () => expect(resolveTenantSelection([membership("a"), membership("b")], "removed")).toBeNull());
  it("restores a valid local tenant selection", () => expect(resolveTenantSelection([membership("a"), membership("b")], "b")).toBe("b"));
  it("returns no selection for zero memberships", () => expect(resolveTenantSelection([], "a")).toBeNull());
});
