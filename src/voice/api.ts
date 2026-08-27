import { z } from "zod";
import { publicApiRequest } from "@/lib/api/client";

export interface WebVoiceSessionContext {
  tenantName: string;
  locationName: string | null;
  locationResolved: boolean;
  channel: "WEB_WIDGET";
}

export interface WebVoiceSession {
  signedUrl: string;
  context: WebVoiceSessionContext;
}

const webVoiceSessionSchema = z.object({
  signedUrl: z.string().min(1),
  context: z.object({
    tenantName: z.string(),
    locationName: z.string().nullable(),
    locationResolved: z.boolean(),
    channel: z.literal("WEB_WIDGET"),
  }),
});

const SESSION_API_TIMEOUT_MS = 12_000;

export class VoiceSessionApiTimeoutError extends Error {}

export async function createWebVoiceSession(widgetKey: string) {
  logSessionDiagnostic("voice:session-api-enter");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SESSION_API_TIMEOUT_MS);
  try {
    const response = await publicApiRequest<unknown>(
      "/voice/web/session",
      {
        method: "POST",
        body: JSON.stringify({ widgetKey }),
        signal: controller.signal,
      },
      {
        onHttpStart: () => logSessionDiagnostic("voice:session-http-start"),
        onHttpResolved: (status) =>
          logSessionDiagnostic("voice:session-http-resolved", { status }),
        onBodyReading: () => logSessionDiagnostic("voice:session-body-reading"),
        onBodyRead: () => logSessionDiagnostic("voice:session-body-read"),
      },
    );
    const session = webVoiceSessionSchema.parse(response);
    logSessionDiagnostic("voice:session-response-validated");
    logSessionDiagnostic("voice:session-api-return");
    return session satisfies WebVoiceSession;
  } catch (error) {
    if (controller.signal.aborted) throw new VoiceSessionApiTimeoutError();
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function logSessionDiagnostic(event: string, detail?: { status: number }) {
  if (process.env.NODE_ENV === "development") console.info(event, detail ?? "");
}
