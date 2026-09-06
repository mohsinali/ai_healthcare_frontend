import {
  ProviderScheduleLocation,
  ProviderWorkingPeriod,
  WEEKDAYS,
} from "@/clinic/types";
import { dayLabel, sortPeriods } from "@/clinic/schedules";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/status-badge";

export function WeeklyAvailabilityOverview({
  locations,
  onEditLocation,
}: {
  locations: ProviderScheduleLocation[];
  onEditLocation: (locationId: string) => void;
}) {
  const hasActivePeriods = locations.some((location) =>
    (location.periods ?? []).some((period) => period.isActive),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Availability Overview</CardTitle>
        <p className="text-sm text-muted-foreground">
          Saved recurring working periods by location. Existing appointments are
          not reflected here.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasActivePeriods && (
          <p role="status" className="rounded-md bg-muted p-3 text-sm">
            No saved active working periods. This provider will not appear in
            appointment availability.
          </p>
        )}
        <div
          className="hidden max-w-full overflow-x-auto rounded-md border md:block"
          tabIndex={0}
          aria-label="Scrollable weekly availability table"
        >
          <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
            <thead className="bg-muted/60">
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 z-10 min-w-56 border-r bg-muted px-3 py-2 font-medium"
                >
                  Location
                </th>
                {WEEKDAYS.map((day) => (
                  <th
                    scope="col"
                    className="min-w-28 px-3 py-2 font-medium"
                    key={day}
                  >
                    {dayLabel(day)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {locations.map((location) => (
                <tr className="border-t align-top" key={location.id}>
                  <th
                    scope="row"
                    className="sticky left-0 z-10 border-r bg-card p-3 font-normal"
                  >
                    <LocationHeading
                      location={location}
                      onEditLocation={onEditLocation}
                    />
                  </th>
                  {WEEKDAYS.map((day) => (
                    <td className="p-3" key={day}>
                      <PeriodSummary
                        periods={(location.periods ?? []).filter(
                          (period) => period.dayOfWeek === day,
                        )}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div
          className="space-y-3 md:hidden"
          aria-label="Mobile weekly availability summaries"
        >
          {locations.map((location) => (
            <section
              className="rounded-md border p-3"
              key={location.id}
              aria-label={`${location.name} weekly availability`}
            >
              <LocationHeading
                location={location}
                onEditLocation={onEditLocation}
              />
              <dl className="mt-3 space-y-2">
                {WEEKDAYS.map((day) => (
                  <div
                    className="grid grid-cols-[6rem_1fr] gap-2 border-t pt-2 first:border-0 first:pt-0"
                    key={day}
                  >
                    <dt className="text-sm font-medium">{dayLabel(day)}</dt>
                    <dd>
                      <PeriodSummary
                        periods={(location.periods ?? []).filter(
                          (period) => period.dayOfWeek === day,
                        )}
                      />
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function LocationHeading({
  location,
  onEditLocation,
}: {
  location: ProviderScheduleLocation;
  onEditLocation: (locationId: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="font-medium">{location.name}</div>
      <div className="text-xs text-muted-foreground">{location.timezone}</div>
      {location.status === "INACTIVE" && (
        <StatusBadge variant="neutral">Inactive location</StatusBadge>
      )}
      <div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="px-0"
          onClick={() => onEditLocation(location.id)}
        >
          Edit {location.name} schedule
        </Button>
      </div>
    </div>
  );
}

function PeriodSummary({ periods }: { periods: ProviderWorkingPeriod[] }) {
  if (!periods.length)
    return <span className="text-xs text-muted-foreground">Not scheduled</span>;
  return (
    <ul className="space-y-1">
      {sortPeriods(periods).map((period, index) => (
        <li
          key={`${period.startTime}-${period.endTime}-${period.isActive}-${index}`}
          className={`whitespace-nowrap rounded px-1.5 py-1 text-xs ${period.isActive ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}
        >
          {period.startTime}–{period.endTime}
          {!period.isActive && (
            <span className="ml-1 font-semibold">Inactive</span>
          )}
        </li>
      ))}
    </ul>
  );
}
