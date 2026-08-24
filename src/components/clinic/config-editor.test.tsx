import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { tenantApiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/client";
import { useTenant } from "@/tenancy/tenant-provider";
import { ConfigEditor } from "./config-editor";

const push = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/api/client", async (original) => ({
  ...(await original<typeof import("@/lib/api/client")>()),
  tenantApiRequest: vi.fn(),
}));
vi.mock("@/tenancy/tenant-provider", () => ({ useTenant: vi.fn() }));
vi.mock("@/components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/clinic/assignment-manager", () => ({
  AssignmentManager: () => null,
}));

const location = {
  id: "location-1",
  name: "Main Clinic",
  status: "ACTIVE",
  phone: "+13055550123",
  email: null,
  timezone: "America/New_York",
  addressLine1: "1 Main St",
  addressLine2: null,
  city: "Miami",
  stateProvince: "FL",
  postalCode: "33101",
  countryCode: "US",
  escalationPhoneNumber: null,
};

function renderEditor(id?: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ConfigEditor kind="locations" id={id} />
    </QueryClientProvider>,
  );
}

function chooseTimezone(search: string, timezone: string) {
  fireEvent.click(screen.getByRole("combobox", { name: "Timezone" }));
  fireEvent.change(screen.getByPlaceholderText("Search timezones..."), {
    target: { value: search },
  });
  fireEvent.click(screen.getByRole("option", { name: timezone }));
}

function chooseCountry(search: string, country: string) {
  fireEvent.click(screen.getByRole("combobox", { name: "Country" }));
  fireEvent.change(screen.getByPlaceholderText("Search countries..."), {
    target: { value: search },
  });
  fireEvent.click(screen.getByRole("option", { name: country }));
}

function fillRequiredLocation(phone = "+923343683084") {
  fireEvent.change(screen.getByLabelText("Location Name"), { target: { value: "Clifton Branch" } });
  fireEvent.change(screen.getByLabelText("Phone"), { target: { value: phone } });
  fireEvent.change(screen.getByLabelText("Address Line 1"), { target: { value: "1 Main St" } });
  fireEvent.change(screen.getByLabelText("City"), { target: { value: "Karachi" } });
  fireEvent.change(screen.getByLabelText("State / Province"), { target: { value: "Sindh" } });
  fireEvent.change(screen.getByLabelText("Postal Code"), { target: { value: "75230" } });
}

describe("Location timezone field", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useTenant).mockReturnValue({
      currentTenant: { id: "tenant-a" },
      tenantRole: "CLINIC_ADMIN",
    } as ReturnType<typeof useTenant>);
  });

  it("searches on create and only saves the selected timezone with Add Location", async () => {
    vi.mocked(tenantApiRequest).mockResolvedValue({ id: "location-new" } as never);
    renderEditor();

    chooseTimezone("karachi", "Asia/Karachi");
    expect(screen.getByRole("combobox", { name: "Timezone" })).toHaveTextContent("Asia/Karachi");
    expect(tenantApiRequest).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Location Name"), { target: { value: "Clifton Branch" } });
    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "+923343683084" } });
    fireEvent.change(screen.getByLabelText("Address Line 1"), { target: { value: "1 Main St" } });
    fireEvent.change(screen.getByLabelText("City"), { target: { value: "Karachi" } });
    fireEvent.change(screen.getByLabelText("State / Province"), { target: { value: "Sindh" } });
    fireEvent.change(screen.getByLabelText("Postal Code"), { target: { value: "75230" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Location" }));

    await waitFor(() => expect(tenantApiRequest).toHaveBeenCalledWith(
      "/locations",
      "tenant-a",
      expect.objectContaining({ body: expect.stringContaining('"timezone":"Asia/Karachi"') }),
    ));
  });

  it("loads and changes the existing timezone, submitting it only with Save Changes", async () => {
    vi.mocked(tenantApiRequest)
      .mockResolvedValueOnce(location as never)
      .mockResolvedValueOnce({ id: "location-1" } as never);
    renderEditor("location-1");

    expect(await screen.findByRole("combobox", { name: "Timezone" })).toHaveTextContent("America/New_York");
    expect(tenantApiRequest).toHaveBeenCalledTimes(1);
    chooseTimezone("london", "Europe/London");
    expect(tenantApiRequest).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(tenantApiRequest).toHaveBeenCalledWith(
      "/locations/location-1",
      "tenant-a",
      expect.objectContaining({
        method: "PATCH",
        body: expect.stringContaining('"timezone":"Europe/London"'),
      }),
    ));
  });

  it("searches countries and submits the selected canonical code", async () => {
    vi.mocked(tenantApiRequest).mockResolvedValue({ id: "location-new" } as never);
    renderEditor();

    chooseCountry("pak", "Pakistan");
    expect(screen.getByRole("combobox", { name: "Country" })).toHaveTextContent("Pakistan");

    fireEvent.change(screen.getByLabelText("Location Name"), { target: { value: "Clifton Branch" } });
    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "+923343683084" } });
    fireEvent.change(screen.getByLabelText("Address Line 1"), { target: { value: "1 Main St" } });
    fireEvent.change(screen.getByLabelText("City"), { target: { value: "Karachi" } });
    fireEvent.change(screen.getByLabelText("State / Province"), { target: { value: "Sindh" } });
    fireEvent.change(screen.getByLabelText("Postal Code"), { target: { value: "75230" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Location" }));

    await waitFor(() => expect(tenantApiRequest).toHaveBeenCalledWith(
      "/locations",
      "tenant-a",
      expect.objectContaining({ body: expect.stringContaining('"countryCode":"PK"') }),
    ));
  });

  it("filters friendly country names and does not accept arbitrary text", () => {
    renderEditor();
    fireEvent.click(screen.getByRole("combobox", { name: "Country" }));
    const search = screen.getByPlaceholderText("Search countries...");
    fireEvent.change(search, { target: { value: "united" } });
    expect(screen.getByRole("option", { name: "United States" })).toBeVisible();
    expect(screen.getByRole("option", { name: "United Kingdom" })).toBeVisible();
    expect(screen.getByRole("option", { name: "United Arab Emirates" })).toBeVisible();

    fireEvent.change(search, { target: { value: "not-a-country" } });
    expect(screen.getByText("No Countries Found")).toBeVisible();
    fireEvent.keyDown(search, { key: "Escape" });
    expect(screen.getByRole("combobox", { name: "Country" })).toHaveTextContent("United States");
    expect(screen.getAllByRole("button", { name: "Add Location" })).toHaveLength(1);
  });

  it("displays the existing country name on edit", async () => {
    vi.mocked(tenantApiRequest).mockResolvedValue(location as never);
    renderEditor("location-1");
    expect(await screen.findByRole("combobox", { name: "Country" })).toHaveTextContent("United States");
  });

  it("renders multiple structured API errors inline and preserves values", async () => {
    vi.mocked(tenantApiRequest).mockRejectedValue(new ApiError("Validation failed", 400, {
      message: "Validation failed.",
      errors: [
        { field: "phone", message: "Enter a valid phone number." },
        { field: "email", message: "Enter a valid email address." },
        { field: "timezone", message: "Select a valid timezone." },
        { field: "countryCode", message: "Select a valid country." },
      ],
    }));
    renderEditor();
    fireEvent.change(screen.getByLabelText("Location Name"), { target: { value: "Clifton Branch" } });
    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "+923343683084" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "clinic@example.com" } });
    fireEvent.change(screen.getByLabelText("Address Line 1"), { target: { value: "1 Main St" } });
    fireEvent.change(screen.getByLabelText("City"), { target: { value: "Karachi" } });
    fireEvent.change(screen.getByLabelText("State / Province"), { target: { value: "Sindh" } });
    fireEvent.change(screen.getByLabelText("Postal Code"), { target: { value: "75230" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Location" }));

    expect(await screen.findByText("Enter a valid phone number.")).toBeVisible();
    expect(screen.getByText("Enter a valid email address.")).toBeVisible();
    expect(screen.getByText("Select a valid timezone.")).toBeVisible();
    expect(screen.getByText("Select a valid country.")).toBeVisible();
    expect(screen.getByLabelText("Location Name")).toHaveValue("Clifton Branch");
    expect(push).not.toHaveBeenCalled();
  });

  it("keeps unknown failures at form level", async () => {
    vi.mocked(tenantApiRequest).mockRejectedValue(new Error("network"));
    renderEditor();
    fireEvent.change(screen.getByLabelText("Location Name"), { target: { value: "Clifton Branch" } });
    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "+923343683084" } });
    fireEvent.change(screen.getByLabelText("Address Line 1"), { target: { value: "1 Main St" } });
    fireEvent.change(screen.getByLabelText("City"), { target: { value: "Karachi" } });
    fireEvent.change(screen.getByLabelText("State / Province"), { target: { value: "Sindh" } });
    fireEvent.change(screen.getByLabelText("Postal Code"), { target: { value: "75230" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Location" }));
    expect(await screen.findByText(/Unable to Save Location/)).toBeVisible();
  });

  it("rejects obvious phone gibberish client-side and clears the error on change", async () => {
    renderEditor();
    fillRequiredLocation("asdfasdf");
    fireEvent.click(screen.getByRole("button", { name: "Add Location" }));

    expect(await screen.findByText("Enter a valid international phone number.")).toBeVisible();
    expect(screen.getByLabelText("Phone")).toHaveAttribute("aria-invalid", "true");
    expect(tenantApiRequest).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "+923343683084" } });
    expect(screen.queryByText("Enter a valid international phone number.")).not.toBeInTheDocument();
  });

  it.each([
    [undefined, "Add Location"],
    ["location-1", "Save Changes"],
  ])("maps a structured backend phone error inline in %s mode", async (id, submitName) => {
    const phoneError = new ApiError("Validation failed", 400, {
      message: "Validation failed.",
      errors: [{ field: "phone", message: "Enter a valid international phone number." }],
    });
    if (id)
      vi.mocked(tenantApiRequest)
        .mockResolvedValueOnce(location as never)
        .mockRejectedValueOnce(phoneError);
    else vi.mocked(tenantApiRequest).mockRejectedValue(phoneError);
    renderEditor(id);
    if (id) await screen.findByDisplayValue("Main Clinic");
    else fillRequiredLocation();

    fireEvent.click(screen.getByRole("button", { name: submitName }));

    expect(await screen.findByText("Enter a valid international phone number.")).toBeVisible();
    expect(screen.getByLabelText("Phone")).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByText(/Unable to Save Location/)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Location Name")).toHaveValue(id ? "Main Clinic" : "Clifton Branch");
    expect(push).not.toHaveBeenCalled();
  });

  it("maps an escalation phone error only to Escalation Phone Number", async () => {
    vi.mocked(tenantApiRequest).mockRejectedValue(new ApiError("Validation failed", 400, {
      errors: [{ field: "escalationPhoneNumber", message: "Enter a valid international phone number." }],
    }));
    renderEditor();
    fillRequiredLocation();
    fireEvent.change(screen.getByLabelText("Escalation Phone Number"), { target: { value: "+13055550124" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Location" }));

    expect(await screen.findByText("Enter a valid international phone number.")).toBeVisible();
    expect(screen.getByLabelText("Escalation Phone Number")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Phone")).toHaveAttribute("aria-invalid", "false");
  });
});
