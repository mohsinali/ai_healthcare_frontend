import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { tenantApiRequest } from "@/lib/api/client";
import { useTenant } from "@/tenancy/tenant-provider";
import { ProviderSchedule } from "./provider-schedule";

vi.mock("@/lib/api/client", async (original) => ({
  ...(await original<typeof import("@/lib/api/client")>()),
  tenantApiRequest: vi.fn(),
}));
vi.mock("@/tenancy/tenant-provider", () => ({ useTenant: vi.fn() }));
const locations = [
  {
    id: "l1",
    name: "Main Clinic",
    timezone: "America/New_York",
    status: "ACTIVE",
    businessHours: [
      {
        dayOfWeek: "MONDAY",
        isClosed: false,
        openTime: "09:00",
        closeTime: "17:00",
      },
    ],
    periods: [
      {
        dayOfWeek: "MONDAY",
        startTime: "13:00",
        endTime: "15:00",
        isActive: true,
      },
      {
        dayOfWeek: "MONDAY",
        startTime: "09:00",
        endTime: "12:00",
        isActive: true,
      },
    ],
  },
  {
    id: "l2",
    name: "West Clinic",
    timezone: "America/Chicago",
    status: "ACTIVE",
    businessHours: [],
    periods: [],
  },
];
function setup(role = "CLINIC_ADMIN") {
  vi.mocked(useTenant).mockReturnValue({
    currentTenant: { id: "t1" },
    tenantRole: role,
  } as ReturnType<typeof useTenant>);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidations = vi.spyOn(client, "invalidateQueries");
  render(
    <QueryClientProvider client={client}>
      <ProviderSchedule providerId="p1" />
    </QueryClientProvider>,
  );
  return invalidations;
}
describe("ProviderSchedule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(tenantApiRequest).mockResolvedValue(locations as never);
  });
  it("loads assigned locations, timezone, status, hours, sorted periods, and empty days", async () => {
    setup();
    expect(screen.getByLabelText("Loading content")).toBeVisible();
    expect(await screen.findByText("Main Clinic")).toBeVisible();
    expect(screen.getByText(/America\/New_York/)).toBeVisible();
    expect(screen.getAllByText("Active location")).toHaveLength(2);
    expect(screen.getByText("Location hours: 09:00–17:00")).toBeVisible();
    const starts = screen.getAllByLabelText(/Start time, Monday period/);
    expect(starts[0]).toHaveValue("09:00");
    expect(starts[1]).toHaveValue("13:00");
    expect(screen.getAllByText("Not scheduled").length).toBeGreaterThan(0);
  });
  it("keeps location drafts isolated, resets, and sends the complete selected schedule", async () => {
    vi.mocked(tenantApiRequest)
      .mockResolvedValueOnce(locations as never)
      .mockResolvedValueOnce([
        {
          dayOfWeek: "MONDAY",
          startTime: "09:00",
          endTime: "12:30",
          isActive: true,
        },
        {
          dayOfWeek: "MONDAY",
          startTime: "13:00",
          endTime: "15:00",
          isActive: true,
        },
      ] as never);
    const invalidations = setup();
    await screen.findByText("Main Clinic");
    fireEvent.change(screen.getAllByLabelText(/End time, Monday period/)[0], {
      target: { value: "12:30" },
    });
    expect(screen.getByText("Unsaved changes")).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", { name: "Save Main Clinic Schedule" }),
    );
    await waitFor(() =>
      expect(tenantApiRequest).toHaveBeenCalledWith(
        "/providers/p1/locations/l1/working-periods",
        "t1",
        expect.objectContaining({ method: "PUT" }),
      ),
    );
    const body = JSON.parse(
      vi.mocked(tenantApiRequest).mock.calls[1][2]!.body as string,
    );
    expect(body.periods).toHaveLength(2);
    expect(
      body.periods.every(
        (p: { dayOfWeek: string }) => p.dayOfWeek === "MONDAY",
      ),
    ).toBe(true);
    expect(body.periods[0]).not.toHaveProperty("key");
    await screen.findByText(/Availability has been updated/);
    expect(invalidations).toHaveBeenCalledWith({
      queryKey: ["appointment-availability", "t1"],
    });
  });
  it("adds, removes, clears and resets only the local draft", async () => {
    setup();
    await screen.findByText("Main Clinic");
    fireEvent.click(
      screen.getAllByRole("button", { name: "Add period for Tuesday" })[0],
    );
    expect(screen.getByLabelText("Start time, Tuesday period 1")).toHaveValue(
      "09:00",
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Remove Tuesday period 1" }),
    );
    fireEvent.click(
      screen.getAllByRole("button", { name: "Clear Schedule" })[0],
    );
    expect(
      screen.queryByLabelText(/Start time, Monday period/),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getAllByRole("button", { name: "Cancel Changes" })[0],
    );
    expect(screen.getAllByLabelText(/Start time, Monday period/)).toHaveLength(
      2,
    );
    expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument();
  });
  it("renders read-only controls for receptionists", async () => {
    setup("RECEPTIONIST");
    await screen.findByText("Main Clinic");
    expect(
      screen.queryByRole("button", { name: /Save Main/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Add period/ }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByLabelText(/Start time/)[0]).toBeDisabled();
  });
  it("shows an assignment action when no locations exist", async () => {
    vi.mocked(tenantApiRequest).mockResolvedValue([] as never);
    setup();
    expect(await screen.findByText("No Assigned Locations")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Assign a Location" }),
    ).toHaveAttribute("href", "/providers/p1/edit");
  });
});
