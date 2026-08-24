import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AssignmentManager } from "./assignment-manager";
import { tenantApiRequest } from "@/lib/api/client";
import { useTenant } from "@/tenancy/tenant-provider";

vi.mock("@/lib/api/client", () => ({ tenantApiRequest: vi.fn() }));
vi.mock("@/tenancy/tenant-provider", () => ({ useTenant: vi.fn() }));

const locations = {
  data: [
    { id: "location-1", name: "Main Clinic", status: "ACTIVE" },
    { id: "location-2", name: "Downtown Clinic", status: "ACTIVE" },
  ],
  meta: { page: 1, limit: 100, total: 2, totalPages: 1 },
};

function renderManager(selected = ["location-1"], editable = true) {
  const onChange = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <AssignmentManager targetType="locations" title="Locations"
        selected={selected} onChange={onChange} editable={editable} />
    </QueryClientProvider>,
  );
  return onChange;
}

describe("AssignmentManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useTenant).mockReturnValue({
      currentTenant: { id: "tenant-a" }, tenantRole: "CLINIC_ADMIN",
    } as ReturnType<typeof useTenant>);
    vi.mocked(tenantApiRequest).mockResolvedValue(locations as never);
  });

  it("changes only the parent draft and has no persistence action", async () => {
    const onChange = renderManager();
    const downtown = await screen.findByRole("checkbox", { name: "Downtown Clinic" });
    fireEvent.click(downtown);
    expect(onChange).toHaveBeenCalledWith(["location-1", "location-2"]);
    expect(tenantApiRequest).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument();
  });

  it("renders assigned values without controls for read-only access", async () => {
    renderManager(["location-1"], false);
    expect(await screen.findByText("Main Clinic")).toBeInTheDocument();
    expect(screen.getByText("Read-only access")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
});
