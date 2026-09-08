import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const loaderSource = readFileSync(
  join(process.cwd(), "public/voice-widget/embed.js"),
  "utf8",
);
const widgetKey = `wgt_${"a".repeat(43)}`;
const token = "t".repeat(43);
const session = {
  signedUrl: "wss://signed.example/private-credential",
  voiceSessionToken: token,
  context: {
    locationKey: "LOC-001",
    locationName: "Downtown",
    locationTimezone: "UTC",
  },
};

function addLoader(key: string | null = widgetKey) {
  const script = document.createElement("script");
  script.src = "http://localhost:3000/voice-widget/embed.js";
  if (key !== null) script.dataset.widgetKey = key;
  document.body.appendChild(script);
  Object.defineProperty(document, "currentScript", {
    configurable: true,
    value: script,
  });
  return script;
}

function executeLoader() {
  window.eval(loaderSource);
}

async function start() {
  executeLoader();
  launcher().click();
  await vi.waitFor(() => {
    expect(shadow().querySelector("elevenlabs-convai")).not.toBeNull();
  });
}

function shadow() {
  return document.querySelector<HTMLElement>(
    '[data-careflow-voice-widget="launcher"]',
  )!.shadowRoot!;
}

function launcher() {
  return shadow().querySelector<HTMLButtonElement>(".cfvw-launcher")!;
}

beforeEach(() => {
  document.head.replaceChildren();
  document.body.replaceChildren();
  delete (window as Window & { __careFlowVoiceWidgetLoader?: unknown })
    .__careFlowVoiceWidgetLoader;
  Object.defineProperty(document, "currentScript", {
    configurable: true,
    value: null,
  });
  vi.spyOn(window.customElements, "get").mockReturnValue(undefined);
  vi.spyOn(window.customElements, "whenDefined").mockResolvedValue(
    undefined as unknown as CustomElementConstructor,
  );
  vi.spyOn(document.head, "appendChild").mockImplementation((node) => {
    const result = Node.prototype.appendChild.call(document.head, node);
    queueMicrotask(() => node.dispatchEvent(new Event("load")));
    return result;
  });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify(session), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  );
});

afterEach(() => {
  window.dispatchEvent(new Event("pagehide"));
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("CareFlow external voice widget loader", () => {
  it("ignores unrelated scripts and makes no request", () => {
    const unrelated = document.createElement("script");
    unrelated.src = "https://example.test/unrelated.js";
    document.body.appendChild(unrelated);
    executeLoader();
    expect(fetch).not.toHaveBeenCalled();
    expect(document.body).toHaveTextContent(
      "Voice assistant is unavailable.",
    );
  });

  it.each([[null], ["bad-key"]])(
    "fails safely for a missing or invalid key (%s)",
    (key) => {
      addLoader(key);
      executeLoader();
      expect(fetch).not.toHaveBeenCalled();
      expect(document.body).toHaveTextContent(
        "Voice assistant is unavailable.",
      );
    },
  );

  it("identifies the executing script and waits for a user gesture", async () => {
    const unrelated = document.createElement("script");
    unrelated.src = "https://example.test/widget.js";
    unrelated.dataset.widgetKey = `wgt_${"b".repeat(43)}`;
    document.body.appendChild(unrelated);
    addLoader();
    executeLoader();
    expect(fetch).not.toHaveBeenCalled();

    await startExistingLoader();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/voice/web/widget-session",
      expect.objectContaining({ method: "POST", credentials: "omit" }),
    );
    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(init.body))).toEqual({ widgetKey });
  });

  it("creates an isolated, fixed, accessible launcher", () => {
    document.head.appendChild(document.createElement("style")).textContent =
      "button { all: unset; position: static !important; }";
    addLoader();
    executeLoader();

    expect(document.body).not.toHaveTextContent("Start voice assistant");
    expect(launcher()).toHaveAccessibleName("Talk to our assistant");
    expect(launcher().type).toBe("button");
    expect(shadow().querySelector("style")!.textContent).toContain(
      "position:fixed",
    );
    expect(shadow().querySelector("style")!.textContent).toContain(
      "right:max(24px",
    );
    expect(shadow().querySelector("style")!.textContent).toContain(
      "bottom:max(24px",
    );
    expect(shadow().querySelector("style")!.textContent).toContain(
      "@media(max-width:480px)",
    );
    expect(shadow().querySelector("style")!.textContent).toContain(
      "prefers-reduced-motion:reduce",
    );
    expect(document.head.querySelectorAll("style")).toHaveLength(1);
  });

  it("shows loading state and prevents duplicate activation", async () => {
    let resolveFetch!: (response: Response) => void;
    vi.mocked(fetch).mockImplementation(
      () => new Promise((resolve) => { resolveFetch = resolve; }),
    );
    addLoader();
    executeLoader();
    launcher().click();
    launcher().click();
    expect(launcher()).toBeDisabled();
    expect(launcher()).toHaveAttribute("aria-busy", "true");
    expect(launcher()).toHaveAccessibleName("Connecting…");
    expect(fetch).toHaveBeenCalledTimes(1);
    resolveFetch(new Response(JSON.stringify(session), { status: 200 }));
    await vi.waitFor(() => expect(shadow().querySelector(WIDGET_TAG)).not.toBeNull());
  });

  it("uses signed-url and connects with dynamic variables already present", async () => {
    addLoader();
    await start();
    const widget = shadow().querySelector("elevenlabs-convai")!;
    expect(widget.getAttribute("signed-url")).toBe(session.signedUrl);
    expect(widget).not.toHaveAttribute("agent-id");
    expect(JSON.parse(widget.getAttribute("dynamic-variables")!)).toEqual({
      secret__voice_widget_key: widgetKey,
      secret__voice_session_token: token,
      selected_location_key: "LOC-001",
      selected_location_name: "Downtown",
      selected_location_timezone: "UTC",
    });
  });

  it("loads the official script once and prevents duplicate sessions/widgets", async () => {
    addLoader();
    executeLoader();
    executeLoader();
    await startExistingLoader();
    await vi.waitFor(() =>
      expect(shadow().querySelector("elevenlabs-convai")).not.toBeNull(),
    );
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(
      document.querySelectorAll(
        'script[data-careflow-elevenlabs-widget="true"]',
      ),
    ).toHaveLength(1);
    expect(shadow().querySelectorAll("elevenlabs-convai")).toHaveLength(1);
    expect(launcher()).not.toBeVisible();
  });

  it("reuses an existing official script", async () => {
    const official = document.createElement("script");
    official.dataset.careflowElevenlabsWidget = "true";
    official.src = "https://unpkg.com/@elevenlabs/convai-widget-embed";
    Node.prototype.appendChild.call(document.head, official);
    addLoader();
    executeLoader();
    const promise = startExistingLoader();
    official.dispatchEvent(new Event("load"));
    await promise;
    expect(
      document.querySelectorAll(
        'script[data-careflow-elevenlabs-widget="true"]',
      ),
    ).toHaveLength(1);
  });

  it("fails safely without creating a widget when bootstrap fails", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 403 }));
    addLoader();
    executeLoader();
    await startExistingLoader();
    await vi.waitFor(() =>
      expect(shadow().querySelector('[role="alert"]')).toHaveTextContent(
        "Voice assistant is unavailable.",
      ),
    );
    expect(shadow().querySelector("elevenlabs-convai")).toBeNull();
    expect(shadow().querySelector(".cfvw-retry")).toBeVisible();
  });

  it("fails safely when the official script fails to load", async () => {
    vi.mocked(document.head.appendChild).mockImplementationOnce((node) => {
      const result = Node.prototype.appendChild.call(document.head, node);
      queueMicrotask(() => node.dispatchEvent(new Event("error")));
      return result;
    });
    addLoader();
    executeLoader();
    await startExistingLoader();
    await vi.waitFor(() =>
      expect(shadow().querySelector('[role="alert"]')).toHaveTextContent(
        "Voice assistant is unavailable.",
      ),
    );
    expect(shadow().querySelector("elevenlabs-convai")).toBeNull();
  });

  it("returns to an enabled launcher for a deliberate retry", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 503 }));
    addLoader();
    executeLoader();
    await startExistingLoader();
    await vi.waitFor(() =>
      expect(shadow().querySelector<HTMLButtonElement>(".cfvw-retry")).toBeVisible(),
    );
    shadow().querySelector<HTMLButtonElement>(".cfvw-retry")!.click();
    expect(launcher()).toBeVisible();
    expect(launcher()).toBeEnabled();
    expect(launcher()).toHaveAttribute("aria-busy", "false");
    expect(fetch).toHaveBeenCalledTimes(1);
    launcher().click();
    await vi.waitFor(() =>
      expect(shadow().querySelector("elevenlabs-convai")).not.toBeNull(),
    );
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("does not expose credentials in text, logs, URLs, or storage", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const localSet = vi.spyOn(Storage.prototype, "setItem");
    addLoader();
    await start();
    expect(shadow().textContent).not.toContain(session.signedUrl);
    expect(shadow().textContent).not.toContain(token);
    expect(location.href).not.toContain(token);
    expect(Array.from(document.querySelectorAll("script")).map((s) => s.src))
      .not.toContain(expect.stringContaining(token));
    expect(localSet).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it("cleans up the widget and listener on pagehide", async () => {
    addLoader();
    await start();
    const widget = shadow().querySelector("elevenlabs-convai")!;
    const remove = vi.spyOn(widget, "removeEventListener");
    window.dispatchEvent(new Event("pagehide"));
    expect(shadow().querySelector("elevenlabs-convai")).toBeNull();
    expect(remove).toHaveBeenCalledWith(
      "elevenlabs-convai:call",
      expect.any(Function),
    );
  });
});

async function startExistingLoader() {
  launcher().click();
  await Promise.resolve();
}

const WIDGET_TAG = "elevenlabs-convai";
