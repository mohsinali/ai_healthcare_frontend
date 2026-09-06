import { afterEach, describe, expect, it, vi } from "vitest";
import { OPTIONS, POST } from "./route";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("widget session proxy", () => {
  it("forwards the browser origin and body to the controlled backend", async () => {
    vi.stubEnv("CAREFLOW_API_BASE_URL", "http://localhost:3002/api/v1/");
    const upstreamFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response('{"signedUrl":"wss://private"}', {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "http://localhost:3001",
          "Cache-Control": "no-store",
          "Content-Type": "application/json",
        },
      }),
    );
    const body = JSON.stringify({ widgetKey });
    const response = await POST(
      new Request("http://localhost:3000/api/v1/voice/web/widget-session", {
        method: "POST",
        headers: {
          Origin: "http://localhost:3001",
          "Content-Type": "application/json",
        },
        body,
      }),
    );

    expect(upstreamFetch).toHaveBeenCalledWith(
      "http://localhost:3002/api/v1/voice/web/widget-session",
      expect.objectContaining({ method: "POST", body }),
    );
    const forwarded = upstreamFetch.mock.calls[0][1]?.headers as Headers;
    expect(forwarded.get("origin")).toBe("http://localhost:3001");
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "http://localhost:3001",
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("completes transport preflight for the localhost clinic origin", async () => {
    vi.stubEnv("CAREFLOW_API_BASE_URL", "http://localhost:3002/api/v1");
    const upstreamFetch = vi.spyOn(globalThis, "fetch");
    const response = await OPTIONS(
      new Request("http://localhost:3000/api/v1/voice/web/widget-session", {
        method: "OPTIONS",
        headers: {
          Origin: "http://localhost:3001",
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "content-type",
        },
      }),
    );
    expect(upstreamFetch).not.toHaveBeenCalled();
    expect(response.status).toBe(204);
    expect(response.body).toBeNull();
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "http://localhost:3001",
    );
    expect(response.headers.get("access-control-allow-methods")).toBe("POST");
    expect(response.headers.get("access-control-allow-headers")).toBe(
      "Content-Type",
    );
    expect(response.headers.has("access-control-allow-credentials")).toBe(false);
  });

  it.each([
    ["invalid origin", "http://localhost:3001/path", "POST", "content-type"],
    ["non-HTTP origin", "file://clinic", "POST", "content-type"],
    ["wrong method", "http://localhost:3001", "PUT", "content-type"],
    ["extra header", "http://localhost:3001", "POST", "authorization"],
  ])("rejects preflight with %s", async (_, origin, method, headers) => {
    const response = await OPTIONS(
      new Request("http://localhost:3000/api/v1/voice/web/widget-session", {
        method: "OPTIONS",
        headers: {
          Origin: origin,
          "Access-Control-Request-Method": method,
          "Access-Control-Request-Headers": headers,
        },
      }),
    );
    expect(response.status).toBe(403);
    expect(response.headers.has("access-control-allow-origin")).toBe(false);
  });

  it("fails closed when the backend destination is not configured", async () => {
    vi.stubEnv("CAREFLOW_API_BASE_URL", "");
    const upstreamFetch = vi.spyOn(globalThis, "fetch");
    const response = await POST(
      new Request("http://localhost:3000/api/v1/voice/web/widget-session", {
        method: "POST",
      }),
    );
    expect(response.status).toBe(503);
    expect(upstreamFetch).not.toHaveBeenCalled();
  });
});

const widgetKey = `wgt_${"a".repeat(43)}`;
