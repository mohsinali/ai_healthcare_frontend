import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("frontend voice environment", () => {
  it("documents only the public widget configuration", () => {
    const example = readFileSync(".env.example", "utf8");

    expect(example).toContain("NEXT_PUBLIC_VOICE_WIDGET_KEY=");
    expect(example).not.toMatch(
      /NEXT_PUBLIC_(ELEVENLABS|VOICE_GATEWAY|JWT|DATABASE)/,
    );
  });
});
