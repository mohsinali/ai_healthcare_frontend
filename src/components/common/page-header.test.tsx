import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageHeader } from "./page-header";
describe("PageHeader", () => { it("renders its page context and action", () => { render(<PageHeader title="Appointments" description="Manage clinic scheduling." actions={<button>Add Appointment</button>} />); expect(screen.getByRole("heading", { name: "Appointments" })).toBeInTheDocument(); expect(screen.getByText("Manage clinic scheduling.")).toBeInTheDocument(); expect(screen.getByRole("button", { name: "Add Appointment" })).toBeInTheDocument(); }); });
