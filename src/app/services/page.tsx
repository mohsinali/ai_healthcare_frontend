"use client";
import { ClipboardList } from "lucide-react";
import { ConfigList } from "@/components/clinic/config-list";
import { Service } from "@/clinic/types";
export default function Page() {
  return (
    <ConfigList<Service>
      kind="services"
      title="Services"
      description="Configure appointment types offered by the clinic."
      columns={["Service", "Duration", "Locations", "Providers"]}
      getName={(x) => x.name}
      render={(x) => [
        <span className="flex items-center gap-2 font-medium" key="n">
          <ClipboardList className="size-4 text-primary" />
          <span>
            {x.name}
            <span className="block text-xs font-normal text-muted-foreground">
              {x.serviceNumber}
            </span>
          </span>
        </span>,
        `${x.durationMinutes} minutes`,
        x.locationCount ?? 0,
        x.providerCount ?? 0,
      ]}
    />
  );
}
