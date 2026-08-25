import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { FaqInput } from "@/faqs/types";
import { FaqForm, validateFaqForm } from "./faq-form";

const value: FaqInput = { category: "HOURS", locationId: null, question: "What are your hours?", answer: "Monday through Friday, 9 AM to 5 PM.", keywords: [] };

describe("FaqForm", () => {
  it("rejects whitespace-only content", () => {
    expect(validateFaqForm({ ...value, question: " ", answer: "\n" })).toMatchObject({ question: "Question is required.", answer: "Answer is required." });
  });
  it("has one submit control and preserves tenant-wide scope", () => {
    const submit = vi.fn();
    render(<FaqForm mode="create" value={value} locations={[]} errors={{}} isSubmitting={false} onChange={vi.fn()} onSubmit={submit} cancelHref="/knowledge-base" />);
    expect(screen.getAllByRole("button", { name: /add faq/i })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /add faq/i }));
    expect(submit).toHaveBeenCalledOnce();
    expect(value.locationId).toBeNull();
  });
  it("adds a trimmed keyword", () => {
    const onChange = vi.fn();
    render(<FaqForm mode="create" value={value} locations={[]} errors={{}} isSubmitting={false} onChange={onChange} onSubmit={vi.fn()} cancelHref="/knowledge-base" />);
    const input = screen.getByLabelText("Keywords");
    fireEvent.change(input, { target: { value: " parking " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ keywords: ["parking"] }));
  });
});
