(function careFlowVoiceWidgetLoader() {
  "use strict";

  var LOADER_STATE = "__careFlowVoiceWidgetLoader";
  var WIDGET_TAG = "elevenlabs-convai";
  var WIDGET_KEY_PATTERN = /^wgt_[A-Za-z0-9_-]{43}$/;
  var ELEVENLABS_SCRIPT_URL = "https://unpkg.com/@elevenlabs/convai-widget-embed";
  var ELEVENLABS_SCRIPT_SELECTOR = 'script[data-careflow-elevenlabs-widget="true"]';
  var SAFE_MESSAGE = "Voice assistant is unavailable.";
  var UNUSED_SESSION_LIFETIME_MS = 14 * 60 * 1000;

  if (window[LOADER_STATE]) return;
  var loaderScript = findLoaderScript();
  var widgetKey = loaderScript && loaderScript.dataset.widgetKey
    ? loaderScript.dataset.widgetKey.trim() : "";
  var state = {
    loaderScript: loaderScript, host: null, shadow: null, launcher: null,
    label: null, status: null, error: null, retry: null, widget: null,
    callListener: null, expiryTimer: null, initializing: false, destroyed: false,
  };
  window[LOADER_STATE] = state;

  if (!loaderScript || !WIDGET_KEY_PATTERN.test(widgetKey)) {
    whenBodyReady(showInitialUnavailable);
    return;
  }

  var bootstrapUrl = new URL(
    "/api/v1/voice/web/widget-session",
    new URL(loaderScript.src, document.baseURI).origin,
  ).href;
  whenBodyReady(mountLauncher);
  window.addEventListener("pagehide", destroy, { once: true });

  function whenBodyReady(callback) {
    if (document.body) callback();
    else document.addEventListener("DOMContentLoaded", callback, { once: true });
  }

  function mountLauncher() {
    if (state.destroyed || state.host || !document.body) return;
    state.host = document.createElement("div");
    state.host.setAttribute("data-careflow-voice-widget", "launcher");
    state.shadow = state.host.attachShadow({ mode: "open" });
    state.shadow.innerHTML =
      "<style>" +
      ":host{all:initial;contain:layout style}" +
      ".cfvw-wrap{all:initial;position:fixed;right:max(24px,env(safe-area-inset-right));bottom:max(24px,env(safe-area-inset-bottom));z-index:2147483000;display:flex;max-width:calc(100vw - 48px);flex-direction:column;align-items:flex-end;gap:8px;font-family:Arial,Helvetica,sans-serif;box-sizing:border-box}" +
      ".cfvw-launcher,.cfvw-retry{appearance:none;-webkit-appearance:none;border:0;margin:0;box-sizing:border-box;font:600 15px/1.2 Arial,Helvetica,sans-serif;text-transform:none;letter-spacing:0;color:#fff;background:#0f766e;cursor:pointer}" +
      ".cfvw-launcher{min-width:44px;min-height:52px;max-width:100%;padding:0 20px 0 16px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;gap:10px;box-shadow:0 8px 24px rgba(15,23,42,.22),0 2px 6px rgba(15,23,42,.14);transition:background-color .16s ease,box-shadow .16s ease,transform .16s ease}" +
      ".cfvw-launcher:hover{background:#0b625c;box-shadow:0 10px 28px rgba(15,23,42,.28),0 3px 8px rgba(15,23,42,.16);transform:translateY(-1px)}" +
      ".cfvw-launcher:active{background:#09534e;box-shadow:0 4px 12px rgba(15,23,42,.22);transform:translateY(1px)}" +
      ".cfvw-launcher:focus-visible,.cfvw-retry:focus-visible{outline:3px solid #fbbf24;outline-offset:3px}" +
      ".cfvw-launcher:disabled{cursor:wait;background:#115e59;transform:none;opacity:1}" +
      ".cfvw-icon,.cfvw-spinner{display:block;width:22px;height:22px;flex:0 0 22px;box-sizing:border-box}" +
      ".cfvw-spinner{display:none;border:2px solid rgba(255,255,255,.45);border-top-color:#fff;border-radius:50%;animation:cfvw-spin .8s linear infinite}" +
      ".cfvw-launcher[aria-busy=true] .cfvw-icon{display:none}.cfvw-launcher[aria-busy=true] .cfvw-spinner{display:block}" +
      ".cfvw-error{all:initial;box-sizing:border-box;max-width:min(290px,calc(100vw - 48px));padding:12px 14px;border:1px solid #cbd5e1;border-radius:12px;color:#1e293b;background:#fff;box-shadow:0 8px 24px rgba(15,23,42,.18);font:400 14px/1.4 Arial,Helvetica,sans-serif}" +
      ".cfvw-error[hidden],.cfvw-launcher[hidden]{display:none}.cfvw-error-row{display:flex;align-items:center;gap:12px}" +
      ".cfvw-retry{min-height:44px;padding:0 14px;border-radius:999px;white-space:nowrap;font-size:14px}.cfvw-retry:hover{background:#0b625c}" +
      ".cfvw-status{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}" +
      "@keyframes cfvw-spin{to{transform:rotate(360deg)}}" +
      "@media(max-width:480px){.cfvw-wrap{right:max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom));max-width:calc(100vw - 24px)}.cfvw-launcher{width:52px;height:52px;padding:0}.cfvw-label{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.cfvw-error{max-width:calc(100vw - 24px)}}" +
      "@media(prefers-reduced-motion:reduce){.cfvw-launcher{transition:none}.cfvw-spinner{animation-duration:1.5s}}" +
      "</style>" +
      '<div class="cfvw-wrap"><div class="cfvw-error" role="alert" hidden><div class="cfvw-error-row"><span>' + SAFE_MESSAGE + '</span><button class="cfvw-retry" type="button">Try again</button></div></div>' +
      '<button class="cfvw-launcher" type="button" aria-label="Talk to our assistant" aria-busy="false"><svg class="cfvw-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3M8 22h8"/></svg><span class="cfvw-spinner" aria-hidden="true"></span><span class="cfvw-label">Talk to our assistant</span></button>' +
      '<span class="cfvw-status" role="status" aria-live="polite"></span></div>';
    state.launcher = state.shadow.querySelector(".cfvw-launcher");
    state.label = state.shadow.querySelector(".cfvw-label");
    state.status = state.shadow.querySelector(".cfvw-status");
    state.error = state.shadow.querySelector(".cfvw-error");
    state.retry = state.shadow.querySelector(".cfvw-retry");
    state.launcher.addEventListener("click", initialize);
    state.retry.addEventListener("click", retry);
    document.body.appendChild(state.host);
  }

  async function initialize() {
    if (state.initializing || state.widget || state.destroyed) return;
    state.initializing = true;
    setLoading(true);
    try {
      var response = await fetch(bootstrapUrl, {
        method: "POST", credentials: "omit",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ widgetKey: widgetKey }),
      });
      if (!response.ok) throw new Error("bootstrap unavailable");
      var session = await response.json();
      if (!isSession(session) || state.destroyed) throw new Error("invalid bootstrap response");
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
      state.callListener = clearExpiryTimer;
      widget.addEventListener("elevenlabs-convai:call", state.callListener);
      state.widget = widget;
      state.launcher.hidden = true;
      state.error.hidden = true;
      state.shadow.querySelector(".cfvw-wrap").appendChild(widget);
      state.expiryTimer = window.setTimeout(function () {
        if (!state.widget) return;
        destroyWidget();
        showFailure();
      }, UNUSED_SESSION_LIFETIME_MS);
    } catch {
      if (!state.destroyed) showFailure();
    } finally {
      state.initializing = false;
    }
  }

  function setLoading(loading) {
    state.launcher.disabled = loading;
    state.launcher.setAttribute("aria-busy", String(loading));
    state.launcher.setAttribute("aria-label", loading ? "Connecting…" : "Talk to our assistant");
    state.label.textContent = loading ? "Connecting…" : "Talk to our assistant";
    state.status.textContent = loading ? "Connecting…" : "";
    state.error.hidden = true;
  }

  function showFailure() {
    setLoading(false);
    state.launcher.hidden = true;
    state.error.hidden = false;
    state.status.textContent = SAFE_MESSAGE;
    state.retry.focus();
  }

  function retry() {
    if (state.initializing || state.widget || state.destroyed) return;
    state.error.hidden = true;
    state.launcher.hidden = false;
    setLoading(false);
    state.launcher.focus();
  }

  function loadElevenLabsScript() {
    if (customElements.get(WIDGET_TAG)) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var existing = document.querySelector(ELEVENLABS_SCRIPT_SELECTOR);
      var script = existing || document.createElement("script");
      var registrationTimer = null;
      function cleanup() {
        script.removeEventListener("load", onLoad);
        script.removeEventListener("error", onError);
        if (registrationTimer !== null) window.clearTimeout(registrationTimer);
      }
      function onLoad() {
        registrationTimer = window.setTimeout(function () {
          cleanup(); reject(new Error("widget registration unavailable"));
        }, 10000);
        customElements.whenDefined(WIDGET_TAG).then(function () {
          cleanup(); resolve();
        }, function () {
          cleanup(); reject(new Error("widget registration unavailable"));
        });
      }
      function onError() {
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
        cleanup(); resolve();
      }
    });
  }

  function findLoaderScript() {
    if (isLoaderScript(document.currentScript)) return document.currentScript;
    var matches = Array.prototype.filter.call(document.querySelectorAll("script[src]"), isLoaderScript);
    return matches.length === 1 ? matches[0] : null;
  }
  function isLoaderScript(script) {
    if (!script || !script.src) return false;
    try { return new URL(script.src, document.baseURI).pathname === "/voice-widget/embed.js"; }
    catch { return false; }
  }
  function isSession(value) {
    return Boolean(value && typeof value.signedUrl === "string" && /^wss:\/\//.test(value.signedUrl) &&
      typeof value.voiceSessionToken === "string" && /^[A-Za-z0-9_-]{43}$/.test(value.voiceSessionToken) &&
      value.context && typeof value.context === "object");
  }
  function showInitialUnavailable() {
    if (state.destroyed || state.host || !document.body) return;
    state.host = document.createElement("div");
    state.host.setAttribute("data-careflow-voice-widget", "unavailable");
    state.host.setAttribute("role", "status");
    state.host.setAttribute("aria-live", "polite");
    state.host.textContent = SAFE_MESSAGE;
    document.body.appendChild(state.host);
  }
  function clearExpiryTimer() {
    if (state.expiryTimer !== null) window.clearTimeout(state.expiryTimer);
    state.expiryTimer = null;
  }
  function destroyWidget() {
    clearExpiryTimer();
    if (state.widget && state.callListener) state.widget.removeEventListener("elevenlabs-convai:call", state.callListener);
    if (state.widget) state.widget.remove();
    state.widget = null;
    state.callListener = null;
  }
  function destroy() {
    if (state.destroyed) return;
    state.destroyed = true;
    document.removeEventListener("DOMContentLoaded", mountLauncher);
    document.removeEventListener("DOMContentLoaded", showInitialUnavailable);
    if (state.launcher) state.launcher.removeEventListener("click", initialize);
    if (state.retry) state.retry.removeEventListener("click", retry);
    window.removeEventListener("pagehide", destroy);
    destroyWidget();
    state.loaderScript = state.launcher = state.host = state.shadow = null;
  }
})();
