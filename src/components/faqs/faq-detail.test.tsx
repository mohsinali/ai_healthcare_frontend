import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { FaqDetail } from "./faq-detail";

const mocks = vi.hoisted(() => ({ useQuery: vi.fn() }));

vi.mock("@tanstack/react-query", () => ({
  useQuery: mocks.useQuery,
  useMutation: () => ({ isPending: false, mutate: vi.fn() }),
  useQueryClient: () => ({ setQueryData: vi.fn(), invalidateQueries: vi.fn() }),
}));
vi.mock("@/tenancy/tenant-provider", () => ({
  useTenant: () => ({ currentTenant: { id: "tenant-1" }, tenantRole: "OWNER" }),
}));
vi.mock("@/components/layout/app-shell", () => ({ AppShell: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

const faq = {
  id: "faq-1",
  faqNumber: "FAQ-001",
  question: "What are your hours?",
  answer: "Monday through Friday.",
  category: "HOURS" as const,
  keywords: ["hours"],
  location: null,
  status: "ACTIVE" as const,
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-02T10:00:00.000Z",
};

describe("FaqDetail", () => {
  beforeEach(() => mocks.useQuery.mockReset());

  it("renders the loading state", () => {
    mocks.useQuery.mockReturnValue({ isLoading: true });
    render(<FaqDetail faqId="faq-1" />);
    expect(screen.getByLabelText("Loading content")).toBeInTheDocument();
  });

  it("renders a valid FAQ, including its FAQ number", () => {
    mocks.useQuery.mockReturnValue({ isLoading: false, isError: false, data: faq });
    render(<FaqDetail faqId="faq-1" />);
    expect(screen.getByRole("heading", { name: "FAQ-001" })).toBeInTheDocument();
    expect(screen.getByText("What are your hours?")).toBeInTheDocument();
    expect(screen.getByText("Monday through Friday.")).toBeInTheDocument();
  });

  it.each([
    [404, "This FAQ does not exist or is not available in the current clinic."],
    [403, "You do not have permission to view this FAQ."],
    [500, "Something went wrong while loading this FAQ."],
  ])("renders a stable error state for HTTP %s", (status, description) => {
    mocks.useQuery.mockReturnValue({ isLoading: false, isError: true, error: new ApiError("failed", status) });
    render(<FaqDetail faqId="faq-1" />);
    expect(screen.getByRole("heading", { name: "Unable to Load FAQ" })).toBeInTheDocument();
    expect(screen.getByText(description)).toBeInTheDocument();
    expect(screen.queryByText("FAQ-001")).not.toBeInTheDocument();
  });

  it("handles a non-API failure", () => {
    mocks.useQuery.mockReturnValue({ isLoading: false, isError: true, error: new Error("failed") });
    render(<FaqDetail faqId="faq-1" />);
    expect(screen.getByText("Something went wrong while loading this FAQ.")).toBeInTheDocument();
  });

  it("handles an unexpectedly undefined FAQ without reading faqNumber", () => {
    mocks.useQuery.mockReturnValue({ isLoading: false, isError: false, data: undefined });
    render(<FaqDetail faqId="faq-1" />);
    expect(screen.getByRole("heading", { name: "Unable to Load FAQ" })).toBeInTheDocument();
    expect(screen.queryByText("FAQ-001")).not.toBeInTheDocument();
  });
});
