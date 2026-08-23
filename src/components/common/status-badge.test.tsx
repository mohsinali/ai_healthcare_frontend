import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "./status-badge";
describe("StatusBadge", () => { it("provides text in addition to color", () => { render(<StatusBadge variant="success">Online</StatusBadge>); expect(screen.getByText("Online")).toBeVisible(); }); });
