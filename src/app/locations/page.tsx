"use client";
import { MapPin } from "lucide-react";
import { ConfigList } from "@/components/clinic/config-list";
import { Location } from "@/clinic/types";
export default function Page() {
  return (
    <ConfigList<Location>
      kind="locations"
      title="Locations"
      description="Manage clinic locations, contact details, and operating hours."
      columns={["Location", "City / State", "Timezone", "Phone"]}
      getName={(x) => x.name}
      render={(x) => [
        <span className="flex items-center gap-2 font-medium" key="n">
          <MapPin className="size-4 text-primary" />
          <span>
            {x.name}
            <span className="block text-xs font-normal text-muted-foreground">
              {x.locationNumber}
            </span>
          </span>
        </span>,
        `${x.city}, ${x.stateProvince}`,
        x.timezone,
        x.phone,
      ]}
    />
  );
}
