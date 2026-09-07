import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(__dirname, "[tenantId]", "page.tsx"), "utf8");

describe("Super Admin tenant member workflow", () => {
  it("contains no global, partial-email, or name-search UI", () => {
    expect(source).not.toContain("/users/search");
    expect(source).not.toContain("Find Existing User");
    expect(source).not.toContain("Name or email");
    expect(source).not.toContain("users.data.map");
  });

  it("submits only exact-email account inputs and never an internal user id", () => {
    expect(source).toContain("email: memberEmail");
    expect(source).toContain("temporaryPassword ? { temporaryPassword } : {}");
    expect(source).not.toContain("userId: selectedUser");
    expect(source).not.toContain("existingUser:");
  });

  it("uses a neutral confirmation flow that clears the temporary password", () => {
    expect(source).toContain('result.state === "confirmation_required"');
    expect(source).toContain('setTemporaryPassword("")');
    expect(source).toContain("/members/confirm-existing");
    expect(source).toContain("Add Existing Account");
    expect(source).not.toContain("existing.firstName");
  });

  it("offers only the three tenant roles and keeps the platform role out", () => {
    expect(source).toContain(
      '["CLINIC_OWNER", "CLINIC_ADMIN", "RECEPTIONIST"]',
    );
    expect(source).not.toContain('"SUPER_ADMIN"]');
  });

  it("prevents duplicate requests and refreshes the member list after success", () => {
    expect(source).toContain("!add.isPending && !confirmExisting.isPending");
    expect(source).toContain('["platform", "tenant", tenantId, "members"]');
  });
});
