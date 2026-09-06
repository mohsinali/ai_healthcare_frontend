(function careFlowVoiceWidgetLoader() {
  "use strict";

  var LOADER_STATE = "__careFlowVoiceWidgetLoader";
  var WIDGET_TAG = "elevenlabs-convai";
  var WIDGET_KEY_PATTERN = /^wgt_[A-Za-z0-9_-]{43}$/;
  var ELEVENLABS_SCRIPT_URL =
    "https://unpkg.com/@elevenlabs/convai-widget-embed";
  var ELEVENLABS_SCRIPT_SELECTOR =
    'script[data-careflow-elevenlabs-widget="true"]';
  var SAFE_MESSAGE = "Voice assistant is currently unavailable.";
  var UNUSED_SESSION_LIFETIME_MS = 14 * 60 * 1000;

  if (window[LOADER_STATE]) return;

  var loaderScript = findLoaderScript();
  var widgetKey = loaderScript && loaderScript.dataset.widgetKey
    ? loaderScript.dataset.widgetKey.trim()
    : "";
  var state = {
    loaderScript: loaderScript,
    host: null,
    button: null,
    widget: null,
    callListener: null,
    expiryTimer: null,
    initializing: false,
    destroyed: false,
  };
  window[LOADER_STATE] = state;

  if (!loaderScript || !WIDGET_KEY_PATTERN.test(widgetKey)) {
    showUnavailable(loaderScript);
    return;
  }

  var loaderUrl = new URL(loaderScript.src, document.baseURI);
  var bootstrapUrl = new URL(
    "/api/v1/voice/web/widget-session",
    loaderUrl.origin,
  ).href;

  state.host = document.createElement("div");
  state.host.setAttribute("data-careflow-voice-widget", "true");
  state.button = document.createElement("button");
  state.button.type = "button";
  state.button.textContent = "Start voice assistant";
  state.button.setAttribute("aria-label", "Start voice assistant");
  state.button.addEventListener("click", initialize, { once: true });
  state.host.appendChild(state.button);
  (document.body || document.documentElement).appendChild(state.host);
  window.addEventListener("pagehide", destroy, { once: true });

  async function initialize() {
    if (state.initializing || state.widget || state.destroyed) return;
    state.initializing = true;
    state.button.disabled = true;
    state.button.textContent = "Preparing voice assistant…";

    try {
      var response = await fetch(bootstrapUrl, {
        method: "POST",
        credentials: "omit",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ widgetKey: widgetKey }),
      });
      if (!response.ok) throw new Error("bootstrap unavailable");
      var session = await response.json();
      if (!isSession(session) || state.destroyed) {
        throw new Error("invalid bootstrap response");
      }

      var dynamicVariables = {
        secret__voice_widget_key: widgetKey,
        secret__voice_session_token: session.voiceSessionToken,
        selected_location_key: session.context.locationKey || "",
        selected_location_name: session.context.locationName || "",
        selected_location_timezone: session.context.locationTimezone || "",
      };

      await loadElevenLabsScript();
      if (state.destroyed) return;

      var widget = document.createElement(WIDGET_TAG);
      widget.setAttribute("signed-url", session.signedUrl);
      widget.setAttribute("dynamic-variables", JSON.stringify(dynamicVariables));
      state.callListener = function () {
        clearExpiryTimer();
      };
      widget.addEventListener("elevenlabs-convai:call", state.callListener);
      state.widget = widget;
      state.host.replaceChildren(widget);

      state.expiryTimer = window.setTimeout(function () {
        if (!state.widget) return;
        destroyWidget();
        showUnavailable(loaderScript, state.host);
      }, UNUSED_SESSION_LIFETIME_MS);
    } catch {
      if (!state.destroyed) showUnavailable(loaderScript, state.host);
    } finally {
      state.initializing = false;
    }
  }

  function loadElevenLabsScript() {
    if (customElements.get(WIDGET_TAG)) return Promise.resolve();

    return new Promise(function (resolve, reject) {
      var existing = document.querySelector(ELEVENLABS_SCRIPT_SELECTOR);
      var script = existing || document.createElement("script");
      var settled = false;
      var registrationTimer = null;

      function cleanup() {
        script.removeEventListener("load", onLoad);
        script.removeEventListener("error", onError);
        if (registrationTimer !== null) window.clearTimeout(registrationTimer);
      }
      function onLoad() {
        script.removeEventListener("load", onLoad);
        script.removeEventListener("error", onError);
        registrationTimer = window.setTimeout(
          function () {
            cleanup();
            reject(new Error("widget registration unavailable"));
          },
          10000,
        );
        customElements.whenDefined(WIDGET_TAG).then(
          function () {
            cleanup();
            resolve();
          },
          function () {
            cleanup();
            reject(new Error("widget registration unavailable"));
          },
        );
      }
      function onError() {
        if (settled) return;
        settled = true;
        cleanup();
        if (!existing) script.remove();
        reject(new Error("widget script unavailable"));
      }

      script.addEventListener("load", onLoad, { once: true });
      script.addEventListener("error", onError, { once: true });
      if (!existing) {
        script.src = ELEVENLABS_SCRIPT_URL;
        script.async = true;
        script.type = "text/javascript";
        script.dataset.careflowElevenlabsWidget = "true";
        document.head.appendChild(script);
      } else if (customElements.get(WIDGET_TAG)) {
        cleanup();
        resolve();
      }
    });
  }

  function findLoaderScript() {
    if (isLoaderScript(document.currentScript)) return document.currentScript;
    var matches = Array.prototype.filter.call(
      document.querySelectorAll("script[src]"),
      isLoaderScript,
    );
    return matches.length === 1 ? matches[0] : null;
  }

  function isLoaderScript(script) {
    if (!script || !script.src) return false;
    try {
      return new URL(script.src, document.baseURI).pathname ===
        "/voice-widget/embed.js";
    } catch {
      return false;
    }
  }

  function isSession(value) {
    return Boolean(
      value &&
        typeof value.signedUrl === "string" &&
        /^wss:\/\//.test(value.signedUrl) &&
        typeof value.voiceSessionToken === "string" &&
        /^[A-Za-z0-9_-]{43}$/.test(value.voiceSessionToken) &&
        value.context &&
        typeof value.context === "object",
    );
  }

  function showUnavailable(script, existingHost) {
    var host = existingHost || document.createElement("div");
    host.setAttribute("data-careflow-voice-widget", "unavailable");
    host.setAttribute("role", "status");
    host.textContent = SAFE_MESSAGE;
    if (!existingHost) {
      var parent = document.body || document.documentElement;
      if (script && script.parentNode && script.parentNode !== document.head) {
        script.insertAdjacentElement("afterend", host);
      } else {
        parent.appendChild(host);
      }
    }
  }

  function clearExpiryTimer() {
    if (state.expiryTimer !== null) window.clearTimeout(state.expiryTimer);
    state.expiryTimer = null;
  }

  function destroyWidget() {
    clearExpiryTimer();
    if (state.widget && state.callListener) {
      state.widget.removeEventListener(
        "elevenlabs-convai:call",
        state.callListener,
      );
    }
    if (state.widget) state.widget.remove();
    state.widget = null;
    state.callListener = null;
  }

  function destroy() {
    if (state.destroyed) return;
    state.destroyed = true;
    if (state.button) state.button.removeEventListener("click", initialize);
    window.removeEventListener("pagehide", destroy);
    destroyWidget();
    state.loaderScript = null;
    state.button = null;
    state.host = null;
  }
})();
