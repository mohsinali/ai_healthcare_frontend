import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AssignmentManager,
  assignmentInvalidationKeys,
  assignmentQueryKey,
} from "./assignment-manager";
import { tenantApiRequest } from "@/lib/api/client";
import { useTenant } from "@/tenancy/tenant-provider";

vi.mock("@/lib/api/client", () => ({ tenantApiRequest: vi.fn() }));
vi.mock("@/tenancy/tenant-provider", () => ({ useTenant: vi.fn() }));

const locationOne = {
  id: "location-1",
  name: "Main Clinic",
  status: "ACTIVE",
};
const locationTwo = {
  id: "location-2",
  name: "Downtown Clinic",
  status: "ACTIVE",
};

function renderManager(role = "CLINIC_ADMIN") {
  vi.mocked(useTenant).mockReturnValue({
    currentTenant: {
      id: "tenant-a",
      name: "Clinic A",
      slug: "clinic-a",
      status: "ACTIVE",
    },
    tenantRole: role,
  } as ReturnType<typeof useTenant>);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidate = vi.spyOn(client, "invalidateQueries");
  render(
    <QueryClientProvider client={client}>
      <AssignmentManager
        ownerType="providers"
        ownerId="provider-1"
        targetType="locations"
        title="Locations"
      />
    </QueryClientProvider>,
  );
  return { client, invalidate };
}

describe("AssignmentManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(tenantApiRequest).mockImplementation(
      async (path, tenantId, init) => {
        expect(tenantId).toBe("tenant-a");
        if (path === "/locations?page=1&limit=100")
          return {
            data: [locationOne, locationTwo],
            meta: { page: 1, limit: 100, total: 2, totalPages: 1 },
          } as never;
        if (
          path === "/providers/provider-1/locations" &&
          init?.method === "PUT"
        )
          return [locationTwo] as never;
        if (path === "/providers/provider-1/locations")
          return [locationOne] as never;
        throw new Error(`Unexpected request: ${path}`);
      },
    );
  });

  it("shows current assignments and adds/removes items", async () => {
    renderManager();
    const main = await screen.findByRole("checkbox", { name: "Main Clinic" });
    const downtown = screen.getByRole("checkbox", { name: "Downtown Clinic" });
    expect(main).toBeChecked();
    expect(downtown).not.toBeChecked();

    fireEvent.click(main);
    fireEvent.click(downtown);
    fireEvent.click(screen.getByRole("button", { name: "Save Assignments" }));

    await waitFor(() =>
      expect(tenantApiRequest).toHaveBeenCalledWith(
        "/providers/provider-1/locations",
        "tenant-a",
        { method: "PUT", body: JSON.stringify({ ids: ["location-2"] }) },
      ),
    );
    expect(await screen.findByText("Assignments saved.")).toBeInTheDocument();
  });

  it("renders Receptionist access as read-only", async () => {
    renderManager("RECEPTIONIST");
    expect(await screen.findByText("Main Clinic")).toBeInTheDocument();
    expect(screen.getByText("Read-only access")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Save Assignments" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("refreshes all related tenant caches after mutation", async () => {
    const { invalidate } = renderManager();
    fireEvent.click(
      await screen.findByRole("checkbox", { name: "Downtown Clinic" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Save Assignments" }));
    await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(6));
    for (const queryKey of assignmentInvalidationKeys("tenant-a"))
      expect(invalidate).toHaveBeenCalledWith({ queryKey });
  });

  it("uses tenant-aware assignment query keys", () => {
    expect(
      assignmentQueryKey("providers", "tenant-a", "provider-1", "services"),
    ).toEqual(["provider", "tenant-a", "provider-1", "services"]);
  });
});
