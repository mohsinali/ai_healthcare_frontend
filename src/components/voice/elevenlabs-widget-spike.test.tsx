import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createWebVoiceSession } from "@/voice/api";
import { ElevenLabsWidgetSpike } from "./elevenlabs-widget-spike";

vi.mock("@/voice/api", () => ({ createWebVoiceSession: vi.fn() }));

const session = {
  signedUrl: "wss://signed.example/private-value",
  voiceSessionToken: "t".repeat(43),
  context: {
    tenantName: "CareFlow Clinic",
    locationKey: "main-clinic",
    locationName: "Main Clinic",
    locationTimezone: "Asia/Karachi",
    locationResolved: true,
    channel: "WEB_WIDGET" as const,
  },
};

let attributesAtConnection: Record<string, string | null> | undefined;

beforeAll(() => {
  if (!customElements.get("elevenlabs-convai")) {
    customElements.define(
      "elevenlabs-convai",
      class extends HTMLElement {
        connectedCallback() {
          attributesAtConnection = {
            signedUrl: this.getAttribute("signed-url"),
            dynamicVariables: this.getAttribute("dynamic-variables"),
            agentId: this.getAttribute("agent-id"),
          };
        }
      },
    );
  }
});

beforeEach(() => {
  attributesAtConnection = undefined;
  vi.stubEnv("NEXT_PUBLIC_VOICE_WIDGET_KEY", "wgt_public-key");
  vi.mocked(createWebVoiceSession).mockResolvedValue(session);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("ElevenLabsWidgetSpike", () => {
  it("does not request a session during render", () => {
    render(<ElevenLabsWidgetSpike />);
    expect(createWebVoiceSession).not.toHaveBeenCalled();
  });

  it("requests a fresh session and connects with attributes already present", async () => {
    render(<ElevenLabsWidgetSpike />);
    fireEvent.click(screen.getByRole("button", { name: /initialize/i }));

    await waitFor(() => expect(attributesAtConnection).toBeDefined());
    expect(createWebVoiceSession).toHaveBeenCalledWith("wgt_public-key");
    expect(attributesAtConnection?.signedUrl).toBe(session.signedUrl);
    expect(attributesAtConnection?.agentId).toBeNull();
    expect(JSON.parse(attributesAtConnection?.dynamicVariables ?? "{}")).toEqual({
      secret__voice_widget_key: "wgt_public-key",
      secret__voice_session_token: session.voiceSessionToken,
      selected_location_key: "main-clinic",
      selected_location_name: "Main Clinic",
      selected_location_timezone: "Asia/Karachi",
    });
  });

  it("prevents duplicate initialization", async () => {
    let resolveSession!: (value: typeof session) => void;
    vi.mocked(createWebVoiceSession).mockReturnValue(
      new Promise((resolve) => {
        resolveSession = resolve;
      }),
    );
    render(<ElevenLabsWidgetSpike />);
    const button = screen.getByRole("button", { name: /initialize/i });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(createWebVoiceSession).toHaveBeenCalledTimes(1);
    resolveSession(session);
    await screen.findByText(/widget ready/i);
  });

  it("does not render or log secrets", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { container } = render(<ElevenLabsWidgetSpike />);
    fireEvent.click(screen.getByRole("button", { name: /initialize/i }));
    await screen.findByText(/widget ready/i);

    expect(container.textContent).not.toContain(session.signedUrl);
    expect(container.textContent).not.toContain(session.voiceSessionToken);
    expect(log).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it("removes the widget during cleanup", async () => {
    render(<ElevenLabsWidgetSpike />);
    fireEvent.click(screen.getByRole("button", { name: /initialize/i }));
    await screen.findByText(/widget ready/i);
    expect(document.querySelector("elevenlabs-convai")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /destroy widget/i }));
    expect(document.querySelector("elevenlabs-convai")).not.toBeInTheDocument();
  });

  it("shows a safe bootstrap error", async () => {
    vi.mocked(createWebVoiceSession).mockRejectedValue(
      new Error(`failed ${session.signedUrl} ${session.voiceSessionToken}`),
    );
    render(<ElevenLabsWidgetSpike />);
    fireEvent.click(screen.getByRole("button", { name: /initialize/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not be initialized/i);
    expect(document.body.textContent).not.toContain(session.signedUrl);
    expect(document.body.textContent).not.toContain(session.voiceSessionToken);
  });
});
