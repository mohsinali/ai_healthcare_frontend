import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "./login-form";
import { useAuth } from "@/auth/auth-provider";
const replace = vi.fn();
let returnTo: string | null = null;
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(returnTo ? { returnTo } : {}),
}));
vi.mock("@/auth/auth-provider", () => ({ useAuth: vi.fn() }));
const signIn = vi.fn().mockResolvedValue(undefined);
function setAuth(isAuthenticated = false) {
  vi.mocked(useAuth).mockReturnValue({
    isAuthenticated,
    signIn,
  } as unknown as ReturnType<typeof useAuth>);
}
describe("LoginForm", () => {
  beforeEach(() => {
    replace.mockReset();
    signIn.mockClear();
    returnTo = null;
    setAuth();
  });
  it("returns a manual login to the requested detail route", async () => {
    returnTo = "/providers/provider-1?tab=services";
    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "admin@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));
    await waitFor(() => expect(signIn).toHaveBeenCalled());
    expect(replace).toHaveBeenCalledWith("/providers/provider-1?tab=services");
  });
  it("rejects an external returnTo and falls back to Dashboard", async () => {
    returnTo = "https://malicious.example.com";
    setAuth(true);
    render(<LoginForm />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
  });
  it("redirects an authenticated login-page visit to a valid returnTo", async () => {
    returnTo = "/locations";
    setAuth(true);
    render(<LoginForm />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/locations"));
  });
});
