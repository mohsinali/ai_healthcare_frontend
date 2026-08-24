import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAuth } from "@/auth/auth-provider";
import { useTenant } from "@/tenancy/tenant-provider";
import AccountPage from "./page";

vi.mock("@/auth/auth-provider", () => ({ useAuth: vi.fn() }));
vi.mock("@/tenancy/tenant-provider", () => ({ useTenant: vi.fn() }));
vi.mock("@/components/layout/app-shell", () => ({ AppShell: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

describe("AccountPage", () => {
  it("shows the current user's safe, read-only profile and selected clinic", () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: "user-a", firstName: "Sarah", lastName: "Johnson", email: "sarah@example.com", status: "ACTIVE", platformRole: null } } as ReturnType<typeof useAuth>);
    vi.mocked(useTenant).mockReturnValue({ currentTenant: { id: "tenant-a", name: "Sunshine Dental" }, tenantRole: "CLINIC_OWNER" } as ReturnType<typeof useTenant>);
    render(<AccountPage />);
    for (const value of ["Sarah", "Johnson", "sarah@example.com", "Active", "Sunshine Dental", "Clinic Owner"])
      expect(screen.getByText(value)).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save|edit/i })).not.toBeInTheDocument();
    expect(screen.queryByText("tenant-a")).not.toBeInTheDocument();
  });
});
