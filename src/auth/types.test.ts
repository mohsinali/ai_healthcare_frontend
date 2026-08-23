import { describe, expect, it } from "vitest";
import { AuthUser, hasPlatformRole, platformRoleLabel } from "./types";
const admin: AuthUser = { id: "1", email: "admin@example.com", firstName: "Sarah", lastName: "Johnson", platformRole: "SUPER_ADMIN", status: "ACTIVE" };
describe("platform role helpers", () => { it("centralizes platform authorization checks", () => { expect(hasPlatformRole(admin, "SUPER_ADMIN")).toBe(true); expect(hasPlatformRole({ ...admin, platformRole: null }, "SUPER_ADMIN")).toBe(false); expect(platformRoleLabel(admin.platformRole)).toBe("Super Admin"); }); });
