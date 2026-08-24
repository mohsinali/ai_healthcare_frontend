import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { tenantApiRequest } from "@/lib/api/client";
import { useTenant } from "@/tenancy/tenant-provider";
import { ConfigEditor } from "./config-editor";

const push = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/api/client", async (original) => ({
  ...(await original<typeof import("@/lib/api/client")>()),
  tenantApiRequest: vi.fn(),
}));
vi.mock("@/tenancy/tenant-provider", () => ({ useTenant: vi.fn() }));
vi.mock("@/components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/clinic/assignment-manager", () => ({
  AssignmentManager: () => null,
}));

const location = {
  id: "location-1",
  name: "Main Clinic",
  status: "ACTIVE",
  phone: "+13055550123",
  email: null,
  timezone: "America/New_York",
  addressLine1: "1 Main St",
  addressLine2: null,
  city: "Miami",
  stateProvince: "FL",
  postalCode: "33101",
  countryCode: "US",
  escalationPhoneNumber: null,
};

function renderEditor(id?: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ConfigEditor kind="locations" id={id} />
    </QueryClientProvider>,
  );
}

function chooseTimezone(search: string, timezone: string) {
  fireEvent.click(screen.getByRole("combobox", { name: "Timezone" }));
  fireEvent.change(screen.getByPlaceholderText("Search timezones..."), {
    target: { value: search },
  });
  fireEvent.click(screen.getByRole("option", { name: timezone }));
}

describe("Location timezone field", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useTenant).mockReturnValue({
      currentTenant: { id: "tenant-a" },
      tenantRole: "CLINIC_ADMIN",
    } as ReturnType<typeof useTenant>);
  });

  it("searches on create and only saves the selected timezone with Add Location", async () => {
    vi.mocked(tenantApiRequest).mockResolvedValue({ id: "location-new" } as never);
    renderEditor();

    chooseTimezone("karachi", "Asia/Karachi");
    expect(screen.getByRole("combobox", { name: "Timezone" })).toHaveTextContent("Asia/Karachi");
    expect(tenantApiRequest).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Location Name"), { target: { value: "Clifton Branch" } });
    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "+923343683084" } });
    fireEvent.change(screen.getByLabelText("Address Line 1"), { target: { value: "1 Main St" } });
    fireEvent.change(screen.getByLabelText("City"), { target: { value: "Karachi" } });
    fireEvent.change(screen.getByLabelText("State / Province"), { target: { value: "Sindh" } });
    fireEvent.change(screen.getByLabelText("Postal Code"), { target: { value: "75230" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Location" }));

    await waitFor(() => expect(tenantApiRequest).toHaveBeenCalledWith(
      "/locations",
      "tenant-a",
      expect.objectContaining({ body: expect.stringContaining('"timezone":"Asia/Karachi"') }),
    ));
  });

  it("loads and changes the existing timezone, submitting it only with Save Changes", async () => {
    vi.mocked(tenantApiRequest)
      .mockResolvedValueOnce(location as never)
      .mockResolvedValueOnce({ id: "location-1" } as never);
    renderEditor("location-1");

    expect(await screen.findByRole("combobox", { name: "Timezone" })).toHaveTextContent("America/New_York");
    expect(tenantApiRequest).toHaveBeenCalledTimes(1);
    chooseTimezone("london", "Europe/London");
    expect(tenantApiRequest).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(tenantApiRequest).toHaveBeenCalledWith(
      "/locations/location-1",
      "tenant-a",
      expect.objectContaining({
        method: "PATCH",
        body: expect.stringContaining('"timezone":"Europe/London"'),
      }),
    ));
  });
});
