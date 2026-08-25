import { describe, expect, it } from "vitest";
import { faqKeys } from "./api";
import { FAQ_CATEGORY_LABELS } from "./types";

describe("FAQ frontend contract", () => {
  it("maps backend categories to human labels", () => {
    expect(FAQ_CATEGORY_LABELS.HOURS).toBe("Hours");
    expect(FAQ_CATEGORY_LABELS.ACCESSIBILITY).toBe("Accessibility");
  });
  it("scopes list and detail keys by tenant", () => {
    expect(faqKeys.list("tenant-a", { page: 1 })).not.toEqual(faqKeys.list("tenant-b", { page: 1 }));
    expect(faqKeys.detail("tenant-a", "faq-1")).not.toEqual(faqKeys.detail("tenant-b", "faq-1"));
  });
});
