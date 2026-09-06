import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, tenantApiRequest } from "@/lib/api/client";
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
    businessHours: [
      {
        dayOfWeek: "MONDAY",
        isClosed: false,
        openTime: "09:00",
        closeTime: "17:00",
      },
    ],
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
  return { client, invalidations };
}
describe("ProviderSchedule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(tenantApiRequest).mockResolvedValue(locations as never);
  });
  it("loads assigned locations, timezone, status, hours, sorted periods, and empty days", async () => {
    setup();
    expect(screen.getByLabelText("Loading content")).toBeVisible();
    expect(
      await screen.findByRole("tab", { name: "Main Clinic" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Weekly Availability Overview" }),
    ).toBeVisible();
    expect(screen.getAllByText(/America\/New_York/).length).toBeGreaterThan(0);
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(2);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(tabs[1]).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tabpanel")).toHaveAccessibleName("Main Clinic");
    expect(screen.getAllByText("Active location")).toHaveLength(1);
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
      ] as never)
      .mockResolvedValueOnce([
        {
          ...locations[0],
          periods: [
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
          ],
        },
        locations[1],
      ] as never);
    const { invalidations } = setup();
    await screen.findByRole("tab", { name: "Main Clinic" });
    fireEvent.change(screen.getAllByLabelText(/End time, Monday period/)[0], {
      target: { value: "12:30" },
    });
    expect(
      within(screen.getByRole("table")).queryByText("09:00–12:30"),
    ).not.toBeInTheDocument();
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
    expect(
      within(screen.getByRole("table")).getByText("09:00–12:30"),
    ).toBeVisible();
    expect(invalidations).toHaveBeenCalledWith({
      queryKey: ["appointment-availability", "t1"],
    });
  });
  it("adds, removes, clears and resets only the local draft", async () => {
    setup();
    await screen.findByRole("tab", { name: "Main Clinic" });
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
  it("switches tabs without requests and preserves accessible unsaved drafts", async () => {
    setup();
    await screen.findByRole("tab", { name: "Main Clinic" });
    expect(tenantApiRequest).toHaveBeenCalledTimes(1);
    fireEvent.change(screen.getByLabelText("End time, Monday period 1"), {
      target: { value: "11:45" },
    });
    expect(
      screen.getByRole("tab", { name: /Main Clinic, Unsaved changes/ }),
    ).toHaveTextContent("Unsaved");

    fireEvent.click(screen.getByRole("tab", { name: "West Clinic" }));
    expect(screen.getByRole("tabpanel")).toHaveAccessibleName("West Clinic");
    expect(
      screen.queryByLabelText(/Start time, Monday/),
    ).not.toBeInTheDocument();
    expect(tenantApiRequest).toHaveBeenCalledTimes(1);

    fireEvent.click(
      screen.getByRole("tab", { name: /Main Clinic, Unsaved changes/ }),
    );
    expect(screen.getByLabelText("End time, Monday period 1")).toHaveValue(
      "11:45",
    );
    expect(tenantApiRequest).toHaveBeenCalledTimes(1);
  });
  it("keeps another location dirty when the selected location is reset", async () => {
    setup();
    await screen.findByRole("tab", { name: "Main Clinic" });
    fireEvent.change(screen.getByLabelText("End time, Monday period 1"), {
      target: { value: "11:45" },
    });
    fireEvent.click(screen.getByRole("tab", { name: "West Clinic" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Add period for Monday" }),
    );
    expect(
      screen.getByRole("tab", { name: /West Clinic, Unsaved changes/ }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Cancel Changes" }));
    expect(screen.getByRole("tab", { name: "West Clinic" })).toBeVisible();
    expect(
      screen.getByRole("tab", { name: /Main Clinic, Unsaved changes/ }),
    ).toBeVisible();
  });
  it("saving the selected location preserves another location's unsaved draft", async () => {
    vi.mocked(tenantApiRequest)
      .mockResolvedValueOnce(locations as never)
      .mockResolvedValueOnce([
        {
          dayOfWeek: "MONDAY",
          startTime: "09:00",
          endTime: "17:00",
          isActive: true,
        },
      ] as never);
    setup();
    await screen.findByRole("tab", { name: "Main Clinic" });
    fireEvent.change(screen.getByLabelText("End time, Monday period 1"), {
      target: { value: "11:45" },
    });
    fireEvent.click(screen.getByRole("tab", { name: "West Clinic" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Add period for Monday" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Save West Clinic Schedule" }),
    );
    await screen.findByText(/Availability has been updated/);
    expect(screen.getByRole("tab", { name: "West Clinic" })).toBeVisible();
    fireEvent.click(
      screen.getByRole("tab", { name: /Main Clinic, Unsaved changes/ }),
    );
    expect(screen.getByLabelText("End time, Monday period 1")).toHaveValue(
      "11:45",
    );
  });
  it("preserves the selected draft after a failed save", async () => {
    vi.mocked(tenantApiRequest)
      .mockResolvedValueOnce(locations as never)
      .mockRejectedValueOnce(
        new ApiError("invalid", 400, {
          code: "PROVIDER_PERIOD_OUTSIDE_LOCATION_HOURS",
          conflicts: [
            {
              dayOfWeek: "MONDAY",
              startTime: "13:00",
              endTime: "16:30",
              proposedOpenTime: "09:00",
              proposedCloseTime: "17:00",
            },
          ],
        }),
      );
    setup();
    await screen.findByRole("tab", { name: "Main Clinic" });
    fireEvent.change(screen.getByLabelText("End time, Monday period 2"), {
      target: { value: "16:30" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Save Main Clinic Schedule" }),
    );
    expect(await screen.findByRole("alert")).toBeVisible();
    expect(screen.getByLabelText("End time, Monday period 2")).toHaveValue(
      "16:30",
    );
    expect(
      screen.getByRole("tab", { name: /Main Clinic, Unsaved changes/ }),
    ).toBeVisible();
  });
  it("keeps inactive locations viewable but prevents active schedule creation", async () => {
    vi.mocked(tenantApiRequest).mockResolvedValue([
      { ...locations[0], status: "INACTIVE" },
    ] as never);
    setup();
    await screen.findByRole("tab", { name: "Main Clinic" });
    expect(screen.getAllByText("Inactive location").length).toBeGreaterThan(0);
    expect(screen.getByRole("note")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Add period for Tuesday" }),
    ).toBeDisabled();
    expect(screen.getByLabelText("Start time, Monday period 1")).toBeDisabled();
    expect(screen.getByLabelText("Deactivate Monday period 1")).toBeEnabled();
  });
  it("uses a horizontally scrollable tab list for many locations", async () => {
    vi.mocked(tenantApiRequest).mockResolvedValue(
      Array.from({ length: 12 }, (_, index) => ({
        ...locations[1],
        id: `l-${index}`,
        name: `Clinic ${index + 1}`,
      })) as never,
    );
    setup();
    const tablist = await screen.findByRole("tablist", {
      name: "Provider schedule locations",
    });
    expect(tablist).toHaveClass("overflow-x-auto");
    expect(screen.getAllByRole("tab")).toHaveLength(12);
    expect(screen.getAllByRole("tabpanel")).toHaveLength(1);
  });
  it("supports arrow-key navigation and selects a remaining assignment after refresh", async () => {
    const { client } = setup();
    const first = await screen.findByRole("tab", { name: "Main Clinic" });
    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "West Clinic" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    client.setQueryData(
      ["provider-working-periods", "t1", "p1"],
      [locations[0]],
    );
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "Main Clinic" })).toHaveAttribute(
        "aria-selected",
        "true",
      ),
    );
    expect(screen.getAllByRole("tab")).toHaveLength(1);
  });
  it("renders read-only controls for receptionists", async () => {
    setup("RECEPTIONIST");
    await screen.findByRole("tab", { name: "Main Clinic" });
    expect(
      screen.queryByRole("button", { name: /Save Main/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Add period/ }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByLabelText(/Start time/)[0]).toBeDisabled();
    fireEvent.click(screen.getByRole("tab", { name: "West Clinic" }));
    expect(screen.getByRole("tabpanel")).toHaveAccessibleName("West Clinic");
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
