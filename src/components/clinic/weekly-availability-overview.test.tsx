import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProviderScheduleLocation } from "@/clinic/types";
import { WeeklyAvailabilityOverview } from "./weekly-availability-overview";

const locations: ProviderScheduleLocation[] = [
  {
    id: "l1",
    name: "Main Clinic",
    timezone: "America/New_York",
    status: "ACTIVE",
    businessHours: [],
    periods: [
      {
        dayOfWeek: "MONDAY",
        startTime: "14:00",
        endTime: "17:00",
        isActive: true,
      },
      {
        dayOfWeek: "MONDAY",
        startTime: "09:00",
        endTime: "12:00",
        isActive: true,
      },
      {
        dayOfWeek: "TUESDAY",
        startTime: "10:00",
        endTime: "11:00",
        isActive: false,
      },
    ],
  },
  {
    id: "l2",
    name: "Closed Branch",
    timezone: "Asia/Karachi",
    status: "INACTIVE",
    businessHours: [],
    periods: [],
  },
];

describe("WeeklyAvailabilityOverview", () => {
  it("renders an accessible Monday-Sunday matrix for every location", () => {
    render(
      <WeeklyAvailabilityOverview
        locations={locations}
        onEditLocation={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Weekly Availability Overview" }),
    ).toBeVisible();
    const table = screen.getByRole("table");
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((heading) => heading.textContent),
    ).toEqual([
      "Location",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ]);
    expect(
      within(table).getByRole("rowheader", { name: /Main Clinic/ }),
    ).toHaveTextContent("America/New_York");
    expect(
      within(table).getByRole("rowheader", { name: /Closed Branch/ }),
    ).toHaveTextContent("Inactive location");
  });

  it("sorts saved wall-clock periods and labels inactive and unscheduled time", () => {
    render(
      <WeeklyAvailabilityOverview
        locations={locations}
        onEditLocation={vi.fn()}
      />,
    );
    const mainRow = within(screen.getByRole("table")).getByRole("row", {
      name: /Main Clinic/,
    });
    const cells = within(mainRow).getAllByRole("cell");
    expect(cells[0]).toHaveTextContent("09:00–12:0014:00–17:00");
    expect(cells[1]).toHaveTextContent("10:00–11:00Inactive");
    expect(cells[2]).toHaveTextContent("Not scheduled");
  });

  it("opens the matching editor location from an accessible action", () => {
    const edit = vi.fn();
    render(
      <WeeklyAvailabilityOverview
        locations={locations}
        onEditLocation={edit}
      />,
    );
    fireEvent.click(
      screen.getAllByRole("button", { name: "Edit Closed Branch schedule" })[0],
    );
    expect(edit).toHaveBeenCalledWith("l2");
  });

  it("shows the no-active-period message and responsive views", () => {
    render(
      <WeeklyAvailabilityOverview
        locations={[
          {
            ...locations[0],
            periods: locations[0].periods.filter((period) => !period.isActive),
          },
        ]}
        onEditLocation={vi.fn()}
      />,
    );
    expect(screen.getByText(/No saved active working periods/)).toBeVisible();
    expect(
      screen.getByLabelText("Scrollable weekly availability table"),
    ).toHaveClass("overflow-x-auto");
    expect(
      screen.getByLabelText("Mobile weekly availability summaries"),
    ).toHaveClass("md:hidden");
  });
});
