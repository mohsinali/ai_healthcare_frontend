import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, tenantApiRequest } from "@/lib/api/client";
import { useTenant } from "@/tenancy/tenant-provider";
import { SettingsForm } from "./settings-form";

vi.mock("@/lib/api/client", async (original) => {
  const actual = await original<typeof import("@/lib/api/client")>();
  return { ...actual, tenantApiRequest: vi.fn() };
});
vi.mock("@/tenancy/tenant-provider", () => ({ useTenant: vi.fn() }));

function renderForm(role = "CLINIC_OWNER") {
  vi.mocked(useTenant).mockReturnValue({
    currentTenant: { id: "tenant-a", name: "Sunshine Dental" },
    tenantRole: role,
  } as ReturnType<typeof useTenant>);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><SettingsForm /></QueryClientProvider>);
  return client;
}

describe("SettingsForm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads tenant settings and has exactly one submit", async () => {
    vi.mocked(tenantApiRequest).mockResolvedValue({ dateFormat: "DD_MM_YYYY", timezone: "Asia/Karachi" });
    const client = renderForm();
    expect(await screen.findByLabelText("Date Format")).toHaveValue("DD_MM_YYYY");
    expect(screen.getByLabelText("Tenant Timezone")).toHaveValue("Asia/Karachi");
    expect(screen.getAllByRole("button", { name: "Save Changes" })).toHaveLength(1);
    expect(client.getQueryData(["settings", "tenant-a"])).toEqual({ dateFormat: "DD_MM_YYYY", timezone: "Asia/Karachi" });
  });

  it("updates through the tenant-scoped endpoint and remains on the form", async () => {
    vi.mocked(tenantApiRequest)
      .mockResolvedValueOnce({ dateFormat: "MM_DD_YYYY", timezone: "UTC" })
      .mockResolvedValueOnce({ dateFormat: "YYYY_MM_DD", timezone: "Asia/Karachi" });
    renderForm();
    fireEvent.change(await screen.findByLabelText("Date Format"), { target: { value: "YYYY_MM_DD" } });
    fireEvent.change(screen.getByLabelText("Tenant Timezone"), { target: { value: "Asia/Karachi" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await screen.findByText("Settings updated.");
    expect(tenantApiRequest).toHaveBeenLastCalledWith("/settings", "tenant-a", expect.objectContaining({ method: "PATCH" }));
    expect(screen.getByLabelText("Date Format")).toBeInTheDocument();
  });

  it("renders field-level API errors", async () => {
    vi.mocked(tenantApiRequest)
      .mockResolvedValueOnce({ dateFormat: "MM_DD_YYYY", timezone: "UTC" })
      .mockRejectedValueOnce(new ApiError("Validation failed", 400, { errors: [{ field: "timezone", message: "Select a valid timezone." }] }));
    renderForm();
    fireEvent.click(await screen.findByRole("button", { name: "Save Changes" }));
    expect(await screen.findByText("Select a valid timezone.")).toBeInTheDocument();
    expect(screen.getByLabelText("Tenant Timezone")).toHaveAttribute("aria-invalid", "true");
  });

  it("does not offer mutation controls to non-owners", async () => {
    vi.mocked(tenantApiRequest).mockResolvedValue({ dateFormat: "MM_DD_YYYY", timezone: "UTC" });
    renderForm("CLINIC_ADMIN");
    await waitFor(() => expect(screen.getByLabelText("Date Format")).toBeDisabled());
    expect(screen.queryByRole("button", { name: "Save Changes" })).not.toBeInTheDocument();
  });
});
