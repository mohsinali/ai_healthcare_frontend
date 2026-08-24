import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConfigDetail, detailQueryKey, formatTime } from "./config-detail";
import { tenantApiRequest } from "@/lib/api/client";
import { useTenant } from "@/tenancy/tenant-provider";

vi.mock("@/lib/api/client", async (original) => ({
  ...(await original<typeof import("@/lib/api/client")>()),
  tenantApiRequest: vi.fn(),
}));
vi.mock("@/tenancy/tenant-provider", () => ({ useTenant: vi.fn() }));
vi.mock("@/components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const location = {
  id: "location-1",
  name: "Main Clinic",
  status: "ACTIVE",
  phone: "+13055550123",
  email: "hello@example.com",
  timezone: "America/New_York",
  addressLine1: "1 Main St",
  addressLine2: null,
  city: "Miami",
  stateProvince: "FL",
  postalCode: "33101",
  countryCode: "US",
  escalationPhoneNumber: "+13055550124",
  createdAt: "2026-08-20T00:00:00.000Z",
  updatedAt: "2026-08-21T00:00:00.000Z",
  businessHours: [
    {
      id: "h1",
      dayOfWeek: "MONDAY",
      isClosed: false,
      openTime: "09:00",
      closeTime: "17:00",
    },
  ],
  providers: [
    {
      id: "provider-1",
      firstName: "Sarah",
      lastName: "Miller",
      displayName: "Dr. Sarah Miller",
      title: null,
      email: null,
      phone: null,
      status: "ACTIVE",
    },
  ],
  services: [
    {
      id: "service-1",
      name: "Consultation",
      description: null,
      durationMinutes: 60,
      status: "ACTIVE",
    },
  ],
} as const;

function renderDetail(role = "CLINIC_ADMIN") {
  vi.mocked(useTenant).mockReturnValue({
    currentTenant: { id: "tenant-a" },
    tenantRole: role,
  } as ReturnType<typeof useTenant>);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ConfigDetail kind="locations" id="location-1" />
    </QueryClientProvider>,
  );
}

describe("ConfigDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(tenantApiRequest).mockResolvedValue(location as never);
  });

  it("renders Location data and assignments as read-only links", async () => {
    renderDetail();
    expect(
      await screen.findByRole("heading", { name: "Main Clinic" }),
    ).toBeInTheDocument();
    expect(screen.getByText("9:00 AM – 5:00 PM")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Dr. Sarah Miller" }),
    ).toHaveAttribute("href", "/providers/provider-1");
    expect(screen.getByRole("link", { name: "Consultation" })).toHaveAttribute(
      "href",
      "/services/service-1",
    );
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(tenantApiRequest).toHaveBeenCalledWith(
      "/locations/location-1",
      "tenant-a",
    );
  });

  it("shows Edit Location for administrators", async () => {
    renderDetail();
    expect(
      await screen.findByRole("link", { name: "Edit Location" }),
    ).toHaveAttribute("href", "/locations/location-1/edit");
  });

  it("hides Edit Location for receptionists", async () => {
    renderDetail("RECEPTIONIST");
    await screen.findByRole("heading", { name: "Main Clinic" });
    expect(
      screen.queryByRole("link", { name: "Edit Location" }),
    ).not.toBeInTheDocument();
  });

  it("uses tenant-aware detail keys and human-friendly time", () => {
    expect(detailQueryKey("providers", "tenant-a", "provider-1")).toEqual([
      "provider",
      "tenant-a",
      "provider-1",
    ]);
    expect(formatTime("13:05")).toBe("1:05 PM");
  });
});
