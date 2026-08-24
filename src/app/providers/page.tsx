"use client";
import { Stethoscope } from "lucide-react";
import { ConfigList } from "@/components/clinic/config-list";
import { Provider } from "@/clinic/types";
export default function Page() {
  return (
    <ConfigList<Provider>
      kind="providers"
      title="Providers"
      description="Manage healthcare providers and the services they offer."
      columns={["Provider", "Title", "Locations", "Services"]}
      getName={(x) => x.displayName || `${x.firstName} ${x.lastName}`}
      render={(x) => [
        <span className="flex items-center gap-2 font-medium" key="n">
          <Stethoscope className="size-4 text-primary" />
          {x.displayName || `${x.firstName} ${x.lastName}`}
        </span>,
        x.title || "—",
        x.locationCount ?? 0,
        x.serviceCount ?? 0,
      ]}
    />
  );
}
