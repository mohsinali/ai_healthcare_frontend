import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("publicApiRequest", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://api.example.test");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("omits authentication, tenant headers, and refresh behavior", async () => {
    const {
      configureApiAuth,
      publicApiRequest,
      setApiAccessToken,
    } = await import("./client");
    const refresh = vi.fn().mockResolvedValue("replacement-token");
    configureApiAuth({ refresh });
    setApiAccessToken("clinic-token");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "public failure" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      publicApiRequest("/voice/web/session", {
        method: "POST",
        body: JSON.stringify({ widgetKey: "wgt_public-key" }),
      }),
    ).rejects.toMatchObject({ status: 401 });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.credentials).toBe("omit");
    expect(init.headers).not.toHaveProperty("Authorization");
    expect(init.headers).not.toHaveProperty("X-Tenant-Id");
    expect(refresh).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reads and returns a successful JSON body", async () => {
    const { publicApiRequest } = await import("./client");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(publicApiRequest("/public")).resolves.toEqual({ ok: true });
  });
});
