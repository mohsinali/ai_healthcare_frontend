import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { emptyPatient } from "@/patients/types";
import { PatientForm } from "./patient-form";

describe("PatientForm single-submit contract", () => {
  it.each(["create", "edit"] as const)(
    "renders one submit control in %s mode",
    (mode) => {
      render(
        <PatientForm
          value={emptyPatient}
          onFieldChange={vi.fn()}
          errors={{}}
          onSubmit={vi.fn()}
          cancelHref="/patients"
          mode={mode}
          busy={false}
        />,
      );
      expect(
        screen
          .getAllByRole("button")
          .filter((button) => button.getAttribute("type") === "submit"),
      ).toHaveLength(1);
      expect(
        screen.queryByRole("button", {
          name: /save contact|save address|save personal/i,
        }),
      ).not.toBeInTheDocument();
    },
  );
  it("renders an accessible field error and preserves typed changes", () => {
    const onFieldChange = vi.fn();
    render(
      <PatientForm
        value={{ ...emptyPatient, phone: "3055550123" }}
        onFieldChange={onFieldChange}
        errors={{ phone: "Enter a valid international phone number." }}
        onSubmit={vi.fn()}
        cancelHref="/patients"
        mode="create"
        busy={false}
      />,
    );
    const phone = screen.getByLabelText("Phone");
    expect(phone).toHaveAttribute("aria-invalid", "true");
    expect(phone).toHaveClass("border-destructive");
    expect(
      screen.getByText("Enter a valid international phone number."),
    ).toBeInTheDocument();
    fireEvent.change(phone, { target: { value: "+13055550123" } });
    expect(onFieldChange).toHaveBeenCalledWith("phone", "+13055550123");
  });
});
