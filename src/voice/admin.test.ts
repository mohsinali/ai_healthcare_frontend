import { describe, expect, it } from "vitest";
import {
  canonicalizeOrigin,
  installationSnippet,
  validateWebsiteOrigin,
} from "./admin";

describe("website origin validation", () => {
  it.each([
    "clinic.example",
    "https://clinic.example/path",
    "https://clinic.example?q=1",
    "https://clinic.example#x",
    "https://*.clinic.example",
    "https://user:pass@clinic.example",
  ])("rejects %s", (value) => {
    expect(validateWebsiteOrigin(value)).toBeTruthy();
  });
  it.each([
    "https://clinic.example",
    "https://www.clinic.example",
    "http://localhost:3001",
  ])("accepts %s", (value) => {
    expect(validateWebsiteOrigin(value)).toBeNull();
  });
  it("uses URL canonicalization", () =>
    expect(canonicalizeOrigin("https://CLINIC.example:443")).toBe(
      "https://clinic.example",
    ));
});

describe("installation snippet", () => {
  it("contains only the loader and public widget key", () => {
    const value = installationSnippet("https://careflow.example", "wgt_public");
    expect(value).toContain(
      'src="https://careflow.example/voice-widget/embed.js"',
    );
    expect(value).toContain('data-widget-key="wgt_public"');
    expect(value).not.toMatch(/tenant|api.?key|token/i);
  });
});
