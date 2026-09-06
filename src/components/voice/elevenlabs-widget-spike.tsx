"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createWebVoiceSession } from "@/voice/api";

export const ELEVENLABS_WIDGET_SCRIPT_URL =
  "https://unpkg.com/@elevenlabs/convai-widget-embed";

// ElevenLabs documents signed URLs as valid for 15 minutes. Expire the unused
// widget early so a person cannot initiate with a stale credential.
const UNUSED_WIDGET_LIFETIME_MS = 14 * 60 * 1000;
const WIDGET_TAG = "elevenlabs-convai";
const SCRIPT_SELECTOR = 'script[data-careflow-elevenlabs-widget="true"]';

type SpikeState = "idle" | "initializing" | "ready" | "error";

export function ElevenLabsWidgetSpike() {
  const hostRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLElement | null>(null);
  const initializingRef = useRef(false);
  const mountedRef = useRef(true);
  const attemptRef = useRef(0);
  const expiryTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const callListenerRef = useRef<EventListener | undefined>(undefined);
  const [state, setState] = useState<SpikeState>("idle");
  const [message, setMessage] = useState(
    "The session is requested only when you initialize the widget.",
  );

  const destroyWidget = useCallback(() => {
    ++attemptRef.current;
    initializingRef.current = false;
    if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
    expiryTimerRef.current = undefined;

    const widget = widgetRef.current;
    if (widget && callListenerRef.current) {
      widget.removeEventListener(
        "elevenlabs-convai:call",
        callListenerRef.current,
      );
    }
    widget?.remove();
    widgetRef.current = null;
    callListenerRef.current = undefined;

    if (mountedRef.current) {
      setState("idle");
      setMessage("Widget destroyed. Initialize again to request a fresh session.");
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      destroyWidget();
    };
  }, [destroyWidget]);

  const initializeWidget = useCallback(async () => {
    if (initializingRef.current || widgetRef.current) return;

    const widgetKey = process.env.NEXT_PUBLIC_VOICE_WIDGET_KEY?.trim() ?? "";
    if (!widgetKey) {
      setState("error");
      setMessage("The development voice widget key is not configured.");
      return;
    }

    initializingRef.current = true;
    const attempt = ++attemptRef.current;
    setState("initializing");
    setMessage("Preparing the ElevenLabs widget…");

    try {
      const session = await createWebVoiceSession(widgetKey);
      if (!mountedRef.current || attempt !== attemptRef.current) return;

      const dynamicVariables = {
        secret__voice_widget_key: widgetKey,
        secret__voice_session_token: session.voiceSessionToken,
        ...(session.context.locationResolved && session.context.locationKey
          ? {
              selected_location_key: session.context.locationKey,
              selected_location_name: session.context.locationName ?? "",
              selected_location_timezone:
                session.context.locationTimezone ?? "",
            }
          : {}),
      };

      await loadElevenLabsWidgetScript();
      if (!mountedRef.current || attempt !== attemptRef.current) return;

      const widget = document.createElement(WIDGET_TAG);
      widget.setAttribute("signed-url", session.signedUrl);
      widget.setAttribute("dynamic-variables", JSON.stringify(dynamicVariables));

      const onCall: EventListener = () => {
        if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
        expiryTimerRef.current = undefined;
        if (mountedRef.current) {
          setMessage("Conversation initiation detected. Complete the manual tool check.");
        }
      };
      widget.addEventListener("elevenlabs-convai:call", onCall);
      callListenerRef.current = onCall;

      // Attributes are set while detached, before the custom element connects.
      hostRef.current?.appendChild(widget);
      widgetRef.current = widget;
      initializingRef.current = false;
      setState("ready");
      setMessage("Widget ready. Start the conversation before the session expires.");

      expiryTimerRef.current = setTimeout(() => {
        if (attempt !== attemptRef.current || !widgetRef.current) return;
        destroyWidget();
        if (mountedRef.current) {
          setState("error");
          setMessage("The unused signed session expired. Initialize a fresh widget.");
        }
      }, UNUSED_WIDGET_LIFETIME_MS);
    } catch {
      if (!mountedRef.current || attempt !== attemptRef.current) return;
      initializingRef.current = false;
      setState("error");
      setMessage("The widget could not be initialized. Try again with a fresh session.");
    }
  }, [destroyWidget]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Official ElevenLabs Widget Spike</CardTitle>
        <CardDescription>
          Development-only validation of the official widget with CareFlow&apos;s
          ephemeral web voice session.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p role={state === "error" ? "alert" : "status"}>{message}</p>
        <div className="flex gap-3">
          <Button
            type="button"
            onClick={() => void initializeWidget()}
            disabled={state === "initializing" || state === "ready"}
          >
            {state === "initializing"
              ? "Initializing…"
              : "Initialize ElevenLabs Widget"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={destroyWidget}
            disabled={state !== "ready"}
          >
            Destroy Widget
          </Button>
        </div>
        <div ref={hostRef} data-testid="elevenlabs-widget-host" />
      </CardContent>
    </Card>
  );
}

function loadElevenLabsWidgetScript(): Promise<void> {
  if (customElements.get(WIDGET_TAG)) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(SCRIPT_SELECTOR);
    const script = existing ?? document.createElement("script");

    const onLoad = () => {
      cleanup();
      void customElements.whenDefined(WIDGET_TAG).then(() => resolve());
    };
    const onError = () => {
      cleanup();
      script.remove();
      reject(new Error("ElevenLabs widget script failed to load"));
    };
    const cleanup = () => {
      script.removeEventListener("load", onLoad);
      script.removeEventListener("error", onError);
    };

    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
    if (!existing) {
      script.src = ELEVENLABS_WIDGET_SCRIPT_URL;
      script.async = true;
      script.type = "text/javascript";
      script.dataset.careflowElevenlabsWidget = "true";
      document.head.appendChild(script);
    }
  });
}
