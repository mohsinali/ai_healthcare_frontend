import { afterEach, describe, expect, it, vi } from "vitest";
import { publicApiRequest } from "@/lib/api/client";
import { createWebVoiceSession } from "./api";

vi.mock("@/lib/api/client", () => ({ publicApiRequest: vi.fn() }));

const session = {
  signedUrl: "wss://signed.example/secret",
  context: {
    tenantName: "Sunshine Medical",
    locationName: "Downtown",
    locationResolved: true,
    channel: "WEB_WIDGET" as const,
  },
};

describe("createWebVoiceSession", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("posts only the widget key through the public client and returns validated JSON", async () => {
    vi.mocked(publicApiRequest).mockImplementation(async (_path, _init, events) => {
      events?.onHttpStart?.();
      events?.onHttpResolved?.(200);
      events?.onBodyReading?.();
      events?.onBodyRead?.();
      return session;
    });

    await expect(createWebVoiceSession("wgt_public-key")).resolves.toEqual(session);

    expect(publicApiRequest).toHaveBeenCalledWith(
      "/voice/web/session",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ widgetKey: "wgt_public-key" }),
        signal: expect.any(AbortSignal),
      }),
    );
    const init = vi.mocked(publicApiRequest).mock.calls[0]?.[1];
    expect(init?.headers).toBeUndefined();
    expect(init?.body).not.toContain("tenantId");
    expect(init?.body).not.toContain("locationId");
  });

  it("rejects malformed successful responses", async () => {
    vi.mocked(publicApiRequest).mockResolvedValue({ context: session.context });
    await expect(createWebVoiceSession("wgt_public-key")).rejects.toMatchObject({
      name: "ZodError",
    });
  });

  it("propagates network failures without an unresolved wrapper promise", async () => {
    const failure = new TypeError("Failed to fetch");
    vi.mocked(publicApiRequest).mockRejectedValue(failure);
    await expect(createWebVoiceSession("wgt_public-key")).rejects.toBe(failure);
  });

  it("does not log the widget key or signed URL", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const log = vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.mocked(publicApiRequest).mockResolvedValue(session);

    await createWebVoiceSession("wgt_public-key");

    const output = JSON.stringify(log.mock.calls);
    expect(output).not.toContain("wgt_public-key");
    expect(output).not.toContain(session.signedUrl);
  });
});
