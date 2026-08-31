"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ConversationProvider,
  useConversationControls,
  useConversationMode,
  useConversationStatus,
} from "@elevenlabs/react";
import {
  AlertCircle,
  AudioLines,
  Building2,
  MapPin,
  Mic,
  Phone,
  PhoneOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ApiError } from "@/lib/api/client";
import {
  createWebVoiceSession,
  VoiceSessionApiTimeoutError,
  type WebVoiceSessionContext,
} from "@/voice/api";

type VoiceState =
  "IDLE" | "CONNECTING" | "CONNECTED" | "DISCONNECTING" | "ERROR";

interface SafeError {
  title: string;
  message: string;
}

export function WebVoiceCard() {
  return (
    <ConversationProvider>
      <WebVoiceCardContent />
    </ConversationProvider>
  );
}

const STARTUP_TIMEOUT_MS = 12_000;

function WebVoiceCardContent() {
  const [state, setState] = useState<VoiceState>("IDLE");
  const [error, setError] = useState<SafeError>();
  const [context, setContext] = useState<WebVoiceSessionContext>();
  const { startSession, endSession } = useConversationControls();
  const { status: sdkStatus } = useConversationStatus();
  const { mode } = useConversationMode();
  const operationInFlight = useRef(false);
  const endingByUser = useRef(false);
  const mounted = useRef(true);
  const startupTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const startupAttempt = useRef(0);

  const clearStartupTimer = useCallback(() => {
    if (startupTimer.current) clearTimeout(startupTimer.current);
    startupTimer.current = undefined;
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearStartupTimer();
      endSession();
    };
  }, [clearStartupTimer, endSession]);

  useEffect(() => {
    logVoiceDiagnostic("voice:status", { status: sdkStatus });
  }, [sdkStatus]);

  const failStartup = useCallback(
    (caught: unknown) => {
      clearStartupTimer();
      operationInFlight.current = false;
      if (!mounted.current) return;
      setError(toSafeError(caught));
      setState("ERROR");
    },
    [clearStartupTimer],
  );

  const startConversation = useCallback(async () => {
    if (operationInFlight.current || state === "CONNECTED") return;
    logVoiceDiagnostic("voice:start-clicked");
    operationInFlight.current = true;
    endingByUser.current = false;
    const operationId = ++startupAttempt.current;
    setState("CONNECTING");
    setError(undefined);
    setContext(undefined);

    const widgetKey = process.env.NEXT_PUBLIC_VOICE_WIDGET_KEY?.trim() ?? "";
    if (!widgetKey) {
      setError({
        title: "Voice Assistant Unavailable",
        message: "The voice widget is not configured for this environment.",
      });
      setState("ERROR");
      operationInFlight.current = false;
      return;
    }

    try {
      // Ask from the click handler so browser media policies see a user gesture.
      // The temporary permission stream is stopped; ElevenLabs owns call media.
      logVoiceDiagnostic("voice:requesting-microphone");
      await requestMicrophoneAccess();
      logVoiceDiagnostic("voice:microphone-granted");

      const beginSession = async (attempt: number) => {
        // Fetch, await, and use a fresh ephemeral URL for every startup attempt.
        // Skipping the await/return at any async layer can strand the UI here.
        logVoiceDiagnostic("voice:requesting-session");
        const session = await createWebVoiceSession(widgetKey);
        if (!mounted.current || operationId !== startupAttempt.current) return;
        if (
          typeof session.signedUrl !== "string" ||
          !session.signedUrl.trim()
        ) {
          throw new ConversationStartupError();
        }
        logVoiceDiagnostic("voice:signed-session-received");
        setContext(session.context);

        clearStartupTimer();
        startupTimer.current = setTimeout(() => {
          if (!mounted.current || operationId !== startupAttempt.current)
            return;
          logVoiceDiagnostic("voice:startup-timeout");
          endSession();
          failStartup(new ConversationTimeoutError());
        }, STARTUP_TIMEOUT_MS);

        logVoiceDiagnostic("voice:calling-startSession");
        // The backend issues signed conversation URLs, so this implementation
        // explicitly uses ElevenLabs' WebSocket transport.
        startSession({
          signedUrl: session.signedUrl,
          connectionType: "websocket",
          textOnly: false,
          dynamicVariables: {
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
          },
          onConnect: () => {
            if (!mounted.current || operationId !== startupAttempt.current)
              return;
            clearStartupTimer();
            operationInFlight.current = false;
            logVoiceDiagnostic("voice:onConnect");
            setState("CONNECTED");
          },
          onDisconnect: (details) => {
            logVoiceDiagnostic("voice:onDisconnect", {
              reason: details.reason,
              closeCode: "closeCode" in details ? details.closeCode : undefined,
            });
            clearStartupTimer();
            operationInFlight.current = false;
            if (!mounted.current || operationId !== startupAttempt.current)
              return;
            if (endingByUser.current) return;
            if (details.reason === "error") {
              setError({
                title: "Call Disconnected",
                message:
                  "The voice connection ended unexpectedly. Please try again.",
              });
              setState("ERROR");
            } else {
              setState("IDLE");
              setContext(undefined);
            }
          },
          onError: (message, cause) => {
            if (!mounted.current || operationId !== startupAttempt.current)
              return;
            logVoiceError("voice:onError", message, cause);
            clearStartupTimer();
            if (attempt === 0 && isRetryableSessionError(message, cause)) {
              endSession();
              void beginSession(1).catch(failStartup);
              return;
            }
            failStartup(new ConversationStartupError());
          },
        });
      };

      await beginSession(0);
    } catch (caught) {
      logCaughtVoiceError("voice:start-handler-error", caught);
      failStartup(caught);
    }
  }, [clearStartupTimer, endSession, failStartup, startSession, state]);

  const endConversation = useCallback(async () => {
    if (operationInFlight.current || state !== "CONNECTED") return;
    operationInFlight.current = true;
    endingByUser.current = true;
    ++startupAttempt.current;
    clearStartupTimer();
    setState("DISCONNECTING");
    try {
      endSession();
    } finally {
      if (mounted.current) {
        setState("IDLE");
        setContext(undefined);
        setError(undefined);
      }
      operationInFlight.current = false;
      endingByUser.current = false;
    }
  }, [clearStartupTimer, endSession, state]);

  const displayedState: VoiceState =
    sdkStatus === "connected"
      ? "CONNECTED"
      : sdkStatus === "error" && state === "CONNECTING"
        ? "ERROR"
        : state;
  const isConnecting = displayedState === "CONNECTING";
  const isDisconnecting = displayedState === "DISCONNECTING";
  const isConnected = displayedState === "CONNECTED";

  return (
    <Card className="w-full max-w-md overflow-hidden">
      <CardHeader className="border-b bg-accent/40">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-accent p-2.5 text-accent-foreground">
            <AudioLines aria-hidden="true" />
          </div>
          <div>
            <CardTitle className="text-base">Voice Assistant</CardTitle>
            <CardDescription className="mt-1">
              Need help? Speak with the virtual front desk.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        <div
          className="flex items-center gap-3 rounded-md border bg-muted/40 p-3"
          role="status"
          aria-live="polite"
        >
          <span
            className={`size-2.5 shrink-0 rounded-full ${statusColor(displayedState)}`}
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-medium">
              {statusLabel(displayedState, mode)}
            </p>
            <p className="text-xs text-muted-foreground">
              {statusDescription(displayedState, mode)}
            </p>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
          >
            <div className="flex gap-2">
              <AlertCircle
                className="mt-0.5 size-4 shrink-0 text-destructive"
                aria-hidden="true"
              />
              <div>
                <p className="font-medium text-destructive">{error.title}</p>
                <p className="mt-1 text-muted-foreground">{error.message}</p>
              </div>
            </div>
          </div>
        )}

        {context && (
          <dl className="grid gap-3 rounded-md border p-3 text-sm">
            <div className="flex items-start gap-2">
              <Building2
                className="mt-0.5 size-4 text-primary"
                aria-hidden="true"
              />
              <div>
                <dt className="text-xs text-muted-foreground">Clinic</dt>
                <dd className="font-medium">{context.tenantName}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin
                className="mt-0.5 size-4 text-primary"
                aria-hidden="true"
              />
              <div>
                <dt className="text-xs text-muted-foreground">Location</dt>
                <dd className="font-medium">
                  {context.locationResolved
                    ? context.locationName
                    : "Location will be selected during the conversation."}
                </dd>
              </div>
            </div>
          </dl>
        )}

        {isConnected || isDisconnecting ? (
          <Button
            type="button"
            variant="destructive"
            className="w-full"
            onClick={endConversation}
            disabled={isDisconnecting}
            loading={isDisconnecting}
            aria-label="End voice call"
          >
            <PhoneOff aria-hidden="true" />
            {isDisconnecting ? "Ending Call..." : "End Call"}
          </Button>
        ) : (
          <Button
            type="button"
            className="w-full"
            onClick={startConversation}
            disabled={isConnecting || isDisconnecting}
            loading={isConnecting}
            aria-label="Start a voice call"
          >
            {isConnecting ? (
              <Mic aria-hidden="true" />
            ) : (
              <Phone aria-hidden="true" />
            )}
            {isConnecting ? "Connecting..." : "Start a Call"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

class ConversationStartupError extends Error {}
class ConversationTimeoutError extends Error {}

async function requestMicrophoneAccess() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new MicrophoneUnavailableError();
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
  } catch {
    throw new MicrophoneAccessError();
  }
}

class MicrophoneAccessError extends Error {}
class MicrophoneUnavailableError extends Error {}

function logVoiceDiagnostic(
  event: string,
  detail?: {
    status?: string;
    conversationId?: string;
    reason?: string;
    closeCode?: number;
  },
) {
  if (process.env.NODE_ENV === "development") console.info(event, detail ?? "");
}

function logCaughtVoiceError(event: string, error: unknown) {
  if (process.env.NODE_ENV !== "development") return;
  console.error(event, {
    name: error instanceof Error ? error.name : "UnknownError",
    message: redactVoiceError(
      error instanceof Error ? error.message : "Voice startup failed",
    ),
  });
}

function logVoiceError(event: string, message: string, cause: unknown) {
  if (process.env.NODE_ENV !== "development") return;
  const safeCause =
    cause instanceof Error
      ? { name: cause.name, message: redactVoiceError(cause.message) }
      : undefined;
  console.error(event, {
    message: redactVoiceError(message),
    cause: safeCause,
  });
}

function redactVoiceError(message: string) {
  return message
    .replace(/wss?:\/\/\S+/gi, "[redacted URL]")
    .replace(/(signedUrl|token|api[_-]?key)\s*[:=]\s*\S+/gi, "$1=[redacted]");
}

function isRetryableSessionError(message: string, cause: unknown) {
  const detail = `${message} ${cause instanceof Error ? cause.message : ""}`;
  return /(?:signed|signature|authori[sz]|token|expired|\b401\b|\b403\b)/i.test(
    detail,
  );
}

function toSafeError(error: unknown): SafeError {
  if (error instanceof MicrophoneAccessError) {
    return {
      title: "Microphone Access Required",
      message:
        "Please allow microphone access to speak with the virtual front desk.",
    };
  }
  if (error instanceof MicrophoneUnavailableError) {
    return {
      title: "Microphone Unavailable",
      message: "Voice calling requires a secure browser connection.",
    };
  }
  if (error instanceof ConversationTimeoutError) {
    return {
      title: "Unable to Start Call",
      message: "Unable to connect to the voice assistant. Please try again.",
    };
  }
  if (error instanceof VoiceSessionApiTimeoutError) {
    return {
      title: "Unable to Start Voice Session",
      message: "The voice session request timed out. Please try again.",
    };
  }
  if (error instanceof ConversationStartupError) {
    return {
      title: "Unable to Start Call",
      message: "The voice connection could not be started. Please try again.",
    };
  }
  if (error instanceof ApiError) {
    if (error.status === 429) {
      return {
        title: "Too Many Attempts",
        message: "Please wait a moment and try again.",
      };
    }
    if (error.status === 404) {
      return {
        title: "Voice Assistant Unavailable",
        message:
          "This voice assistant is not available. Please check the widget configuration.",
      };
    }
    if (error.status === 502 || error.status === 503) {
      return {
        title: "Voice Service Unavailable",
        message:
          "The voice service is temporarily unavailable. Please try again shortly.",
      };
    }
  }
  return {
    title: "Unable to Start Call",
    message: "Please check your connection and try again.",
  };
}

function statusLabel(state: VoiceState, mode: "listening" | "speaking") {
  if (state === "CONNECTING") return "Connecting";
  if (state === "DISCONNECTING") return "Ending call";
  if (state === "CONNECTED")
    return mode === "speaking" ? "Assistant speaking" : "Listening";
  if (state === "ERROR") return "Call not connected";
  return "Ready to call";
}

function statusDescription(state: VoiceState, mode: "listening" | "speaking") {
  if (state === "CONNECTING") return "Preparing a secure voice session...";
  if (state === "DISCONNECTING") return "Closing the voice connection...";
  if (state === "CONNECTED")
    return mode === "speaking"
      ? "The assistant is responding."
      : "You can speak now.";
  if (state === "ERROR") return "Review the message below and try again.";
  return "Your microphone is used only during the call.";
}

function statusColor(state: VoiceState) {
  if (state === "CONNECTED") return "bg-success";
  if (state === "CONNECTING" || state === "DISCONNECTING")
    return "animate-pulse bg-warning";
  if (state === "ERROR") return "bg-destructive";
  return "bg-muted-foreground";
}
