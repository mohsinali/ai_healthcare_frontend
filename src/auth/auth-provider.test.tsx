import { StrictMode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./auth-provider";
import { apiRequest } from "@/lib/api/client";
vi.mock("@/lib/api/client", () => ({
  apiRequest: vi.fn(),
  configureApiAuth: vi.fn(),
  setApiAccessToken: vi.fn(),
}));
function Status() {
  return <span>{useAuth().status}</span>;
}
function renderProvider() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <StrictMode>
      <QueryClientProvider client={client}>
        <AuthProvider>
          <Status />
        </AuthProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
}
describe("AuthProvider bootstrap", () => {
  beforeEach(() => vi.clearAllMocks());
  it("restores one session only once under Strict Mode", async () => {
    vi.mocked(apiRequest).mockImplementation(async (path) =>
      path === "/auth/refresh"
        ? ({ accessToken: "token" } as never)
        : ({
            id: "user-1",
            email: "owner@example.com",
            firstName: "Clinic",
            lastName: "Owner",
            platformRole: null,
            status: "ACTIVE",
            tenantMemberships: [],
          } as never),
    );
    renderProvider();
    expect(screen.getByText("checking")).toBeInTheDocument();
    await screen.findByText("authenticated");
    expect(apiRequest).toHaveBeenCalledTimes(2);
    expect(apiRequest).toHaveBeenCalledWith(
      "/auth/refresh",
      { method: "POST" },
      false,
    );
    expect(apiRequest).toHaveBeenCalledWith("/auth/me");
  });
  it("becomes unauthenticated only after refresh failure", async () => {
    vi.mocked(apiRequest).mockRejectedValue(new Error("expired"));
    renderProvider();
    expect(screen.getByText("checking")).toBeInTheDocument();
    await screen.findByText("unauthenticated");
    await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(1));
  });
});
