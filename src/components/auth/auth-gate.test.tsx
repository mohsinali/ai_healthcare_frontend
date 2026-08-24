import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthGate } from "./auth-gate";
import { useAuth } from "@/auth/auth-provider";
const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/providers/abc",
  useSearchParams: () => new URLSearchParams("page=2&status=ACTIVE"),
}));
vi.mock("@/auth/auth-provider", () => ({ useAuth: vi.fn() }));
function auth(
  status: "checking" | "authenticated" | "unauthenticated" | "unavailable",
) {
  vi.mocked(useAuth).mockReturnValue({
    status,
    isAuthenticated: status === "authenticated",
  } as ReturnType<typeof useAuth>);
}
describe("AuthGate", () => {
  beforeEach(() => {
    replace.mockReset();
    window.history.replaceState({}, "", "/providers/abc?page=2&status=ACTIVE");
  });
  it("does not redirect while session bootstrap is checking", () => {
    auth("checking");
    render(
      <AuthGate>
        <p>Protected</p>
      </AuthGate>,
    );
    expect(screen.getByLabelText("Checking session")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
  it("renders the requested page after authentication without navigation", () => {
    auth("authenticated");
    render(
      <AuthGate>
        <p>Protected</p>
      </AuthGate>,
    );
    expect(screen.getByText("Protected")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
  it("redirects a definitively logged-out user with the exact return path", async () => {
    auth("unauthenticated");
    render(
      <AuthGate>
        <p>Protected</p>
      </AuthGate>,
    );
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(
        "/login?returnTo=%2Fproviders%2Fabc%3Fpage%3D2%26status%3DACTIVE",
      ),
    );
  });
  it("shows access unavailable instead of redirecting to Dashboard", () => {
    auth("unavailable");
    render(
      <AuthGate>
        <p>Protected</p>
      </AuthGate>,
    );
    expect(screen.getByText("Account Access Unavailable")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
