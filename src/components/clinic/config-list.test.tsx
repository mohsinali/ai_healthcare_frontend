import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConfigList } from "./config-list";
import { tenantApiRequest } from "@/lib/api/client";
import { useTenant } from "@/tenancy/tenant-provider";
import { Service } from "@/clinic/types";

vi.mock("@/lib/api/client", () => ({ tenantApiRequest: vi.fn() }));
vi.mock("@/tenancy/tenant-provider", () => ({ useTenant: vi.fn() }));
vi.mock("@/components/layout/app-shell", () => ({ AppShell: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

describe("ConfigList navigation", () => {
  beforeEach(() => {
    vi.mocked(useTenant).mockReturnValue({ currentTenant: { id: "tenant-a" }, tenantRole: "CLINIC_ADMIN" } as ReturnType<typeof useTenant>);
    vi.mocked(tenantApiRequest).mockResolvedValue({ data: [{ id: "service-1", name: "Consultation", status: "ACTIVE" }], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } } as never);
  });

  it("links the record name to detail and Edit to the edit route", async () => {
    render(<QueryClientProvider client={new QueryClient()}><ConfigList<Service> kind="services" title="Services" description="Services" columns={["Service"]} getName={(item) => item.name} render={(item) => [item.name]} /></QueryClientProvider>);
    expect(await screen.findByRole("link", { name: "View Consultation" })).toHaveAttribute("href", "/services/service-1");
    expect(screen.getByRole("link", { name: "Edit" })).toHaveAttribute("href", "/services/service-1/edit");
  });
});
