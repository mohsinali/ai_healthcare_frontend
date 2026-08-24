import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlatformGate } from "./platform-gate";
import { useAuth } from "@/auth/auth-provider";
vi.mock("@/auth/auth-provider", () => ({ useAuth: vi.fn() }));
describe("PlatformGate", () => {
  it("shows Access Denied without redirecting unauthorized users", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { platformRole: null },
    } as ReturnType<typeof useAuth>);
    render(
      <PlatformGate>
        <p>Restricted</p>
      </PlatformGate>,
    );
    expect(screen.getByText("Access Denied")).toBeInTheDocument();
    expect(screen.queryByText("Restricted")).not.toBeInTheDocument();
  });
});
