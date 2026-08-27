import { StrictMode } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { createWebVoiceSession } from "@/voice/api";
import { WebVoiceCard } from "./web-voice-card";

const sdk = vi.hoisted(() => ({
  startSession: vi.fn(),
  endSession: vi.fn(),
}));

vi.mock("@/voice/api", () => ({
  createWebVoiceSession: vi.fn(),
  VoiceSessionApiTimeoutError: class VoiceSessionApiTimeoutError extends Error {},
}));
vi.mock("@elevenlabs/react", () => ({
  ConversationProvider: ({ children }: { children: React.ReactNode }) => children,
  useConversationControls: () => sdk,
  useConversationStatus: () => ({ status: "disconnected" }),
  useConversationMode: () => ({ mode: "listening" }),
}));

const session = {
  signedUrl: "wss://signed.example/secret-token",
  context: {
    tenantName: "Sunshine Medical",
    locationName: "Downtown Clinic",
    locationResolved: true,
    channel: "WEB_WIDGET" as const,
  },
};

function mockMicrophone(allowed = true) {
  const stop = vi.fn();
  const getUserMedia = allowed
    ? vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] })
    : vi.fn().mockRejectedValue(new DOMException("Denied", "NotAllowedError"));
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia },
  });
  return { getUserMedia, stop };
}

describe("WebVoiceCard", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_VOICE_WIDGET_KEY", "wgt_from-environment");
    mockMicrophone();
    vi.mocked(createWebVoiceSession).mockResolvedValue(session);
    sdk.endSession.mockReturnValue(undefined);
    sdk.startSession.mockImplementation((options) => {
      options.onConversationCreated?.({ getId: () => "conversation-safe-id" });
      options.onConnect?.({ conversationId: "conversation-safe-id" });
    });
  });

  it("renders idle without requesting a signed session", () => {
    render(<WebVoiceCard />);
    expect(screen.getByText("Ready to call")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Start a voice call" }),
    ).toHaveTextContent("Start a Call");
    expect(createWebVoiceSession).not.toHaveBeenCalled();
  });

  it("requests a session on click, blocks duplicates, and starts with the signed URL", async () => {
    let resolveSession!: (value: typeof session) => void;
    vi.mocked(createWebVoiceSession).mockReturnValue(
      new Promise((resolve) => {
        resolveSession = resolve;
      }),
    );
    render(<WebVoiceCard />);
    const start = screen.getByRole("button", { name: "Start a voice call" });

    fireEvent.click(start);
    fireEvent.click(start);

    expect(screen.getByText("Connecting")).toBeInTheDocument();
    expect(start).toBeDisabled();
    await waitFor(() => expect(createWebVoiceSession).toHaveBeenCalledTimes(1));
    expect(createWebVoiceSession).toHaveBeenCalledWith("wgt_from-environment");
    resolveSession(session);

    await waitFor(() =>
      expect(sdk.startSession).toHaveBeenCalledTimes(1),
    );
    expect(sdk.startSession).toHaveBeenCalledWith(
      expect.objectContaining({
        signedUrl: session.signedUrl,
        connectionType: "websocket",
        textOnly: false,
      }),
    );
    expect(screen.queryByText(session.signedUrl)).not.toBeInTheDocument();
    await screen.findByText("Listening");
    expect(screen.getByText("Sunshine Medical")).toBeInTheDocument();
  });

  it("continues startup after the Strict Mode effect cleanup probe", async () => {
    let resolveSession!: (value: typeof session) => void;
    vi.mocked(createWebVoiceSession).mockReturnValue(
      new Promise((resolve) => {
        resolveSession = resolve;
      }),
    );
    render(
      <StrictMode>
        <WebVoiceCard />
      </StrictMode>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Start a voice call" }));
    await waitFor(() => expect(createWebVoiceSession).toHaveBeenCalledTimes(1));
    resolveSession(session);

    await waitFor(() => expect(sdk.startSession).toHaveBeenCalledTimes(1));
    expect(sdk.startSession).toHaveBeenCalledWith(
      expect.objectContaining({ signedUrl: session.signedUrl }),
    );
    expect(screen.queryByText("Connecting")).not.toBeInTheDocument();
  });

  it("retries one startup failure with a newly requested signed URL", async () => {
    vi.mocked(createWebVoiceSession)
      .mockResolvedValueOnce(session)
      .mockResolvedValueOnce({
        ...session,
        signedUrl: "wss://signed.example/fresh",
      });
    sdk.startSession
      .mockImplementationOnce((options) =>
        options.onError?.("signed URL expired", new Error("expired")),
      )
      .mockImplementationOnce((options) =>
        options.onConnect?.({ conversationId: "conversation-safe-id" }),
      );
    render(<WebVoiceCard />);

    fireEvent.click(screen.getByRole("button", { name: "Start a voice call" }));

    await screen.findByText("Listening");
    expect(createWebVoiceSession).toHaveBeenCalledTimes(2);
    expect(sdk.startSession).toHaveBeenLastCalledWith(
      expect.objectContaining({
        signedUrl: "wss://signed.example/fresh",
        connectionType: "websocket",
      }),
    );
  });

  it("shows a safe rate-limit error", async () => {
    vi.mocked(createWebVoiceSession).mockRejectedValue(
      new ApiError("provider internals", 429, { secret: "do not show" }),
    );
    render(<WebVoiceCard />);

    fireEvent.click(screen.getByRole("button", { name: "Start a voice call" }));

    expect(await screen.findByText("Too Many Attempts")).toBeInTheDocument();
    expect(
      screen.getByText("Please wait a moment and try again."),
    ).toBeInTheDocument();
    expect(screen.queryByText("provider internals")).not.toBeInTheDocument();
  });

  it("shows a safe error for an unavailable widget", async () => {
    vi.mocked(createWebVoiceSession).mockRejectedValue(
      new ApiError("Web voice channel is unavailable.", 404),
    );
    render(<WebVoiceCard />);

    fireEvent.click(screen.getByRole("button", { name: "Start a voice call" }));

    expect(
      await screen.findByText("Voice Assistant Unavailable"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/check the widget configuration/i),
    ).toBeInTheDocument();
  });

  it("stops after one startup retry and allows a manual retry", async () => {
    sdk.startSession.mockImplementation((options) =>
      options.onError?.("signed URL expired", new Error("expired")),
    );
    render(<WebVoiceCard />);

    fireEvent.click(screen.getByRole("button", { name: "Start a voice call" }));

    expect(await screen.findByText("Unable to Start Call")).toBeInTheDocument();
    expect(sdk.startSession).toHaveBeenCalledTimes(2);
    expect(createWebVoiceSession).toHaveBeenCalledTimes(2);
    expect(
      screen.getByRole("button", { name: "Start a voice call" }),
    ).toBeEnabled();
  });

  it("redacts a signed URL from development error diagnostics", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    sdk.startSession.mockImplementation((options) =>
      options.onError?.(
        `connection failed for ${session.signedUrl}`,
        new Error(`signedUrl=${session.signedUrl}`),
      ),
    );
    render(<WebVoiceCard />);

    fireEvent.click(screen.getByRole("button", { name: "Start a voice call" }));

    expect(await screen.findByText("Unable to Start Call")).toBeInTheDocument();
    const logged = JSON.stringify(errorLog.mock.calls);
    expect(logged).not.toContain(session.signedUrl);
    expect(logged).toContain("[redacted URL]");
  });

  it("handles microphone denial without exposing the browser exception", async () => {
    mockMicrophone(false);
    render(<WebVoiceCard />);

    fireEvent.click(screen.getByRole("button", { name: "Start a voice call" }));

    expect(
      await screen.findByText("Microphone Access Required"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Please allow microphone access/),
    ).toBeInTheDocument();
    expect(sdk.startSession).not.toHaveBeenCalled();
  });

  it("requests microphone permission before the session and stops the temporary stream", async () => {
    const { getUserMedia, stop } = mockMicrophone();
    render(<WebVoiceCard />);

    fireEvent.click(screen.getByRole("button", { name: "Start a voice call" }));

    await screen.findByText("Listening");
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(stop).toHaveBeenCalledTimes(1);
    expect(getUserMedia.mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(createWebVoiceSession).mock.invocationCallOrder[0],
    );
  });

  it("shows a secure-context error when microphone media APIs are unavailable", async () => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: undefined,
    });
    render(<WebVoiceCard />);

    fireEvent.click(screen.getByRole("button", { name: "Start a voice call" }));

    expect(await screen.findByText("Microphone Unavailable")).toBeInTheDocument();
    expect(screen.getByText(/secure browser connection/i)).toBeInTheDocument();
    expect(createWebVoiceSession).not.toHaveBeenCalled();
  });

  it("leaves Connecting after the startup timeout", async () => {
    vi.useFakeTimers();
    sdk.startSession.mockImplementation(() => undefined);
    render(<WebVoiceCard />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Start a voice call" }));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText("Connecting")).toBeInTheDocument();

    await act(async () => vi.advanceTimersByTime(12_000));
    expect(screen.getByText("Unable to Start Call")).toBeInTheDocument();
    expect(sdk.endSession).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("ends a call and requests a fresh session for the next call", async () => {
    render(<WebVoiceCard />);
    fireEvent.click(screen.getByRole("button", { name: "Start a voice call" }));
    const end = await screen.findByRole("button", { name: "End voice call" });

    fireEvent.click(end);

    await waitFor(() => expect(sdk.endSession).toHaveBeenCalledTimes(1));
    const startAgain = await screen.findByRole("button", {
      name: "Start a voice call",
    });
    fireEvent.click(startAgain);
    await waitFor(() => expect(createWebVoiceSession).toHaveBeenCalledTimes(2));
  });
});
