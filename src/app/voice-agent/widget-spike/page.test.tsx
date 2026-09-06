import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ElevenLabsWidgetSpikePage from "./page";

const { notFound } = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("next/navigation", () => ({ notFound }));
vi.mock("@/components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

afterEach(() => {
  vi.unstubAllEnvs();
  notFound.mockClear();
});

describe("ElevenLabsWidgetSpikePage", () => {
  it("renders outside production", () => {
    render(<ElevenLabsWidgetSpikePage />);
    expect(screen.getByText("ElevenLabs Widget Spike")).toBeInTheDocument();
  });

  it("uses the not-found guard in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => ElevenLabsWidgetSpikePage()).toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalledOnce();
  });
});
