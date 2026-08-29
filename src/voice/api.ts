import { z } from "zod";
import { publicApiRequest } from "@/lib/api/client";

export interface WebVoiceSessionContext {
  tenantName: string;
  locationKey: string | null;
  locationName: string | null;
  locationTimezone: string | null;
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
    locationKey: z.string().nullable(),
    locationName: z.string().nullable(),
    locationTimezone: z.string().nullable(),
    locationResolved: z.boolean(),
    channel: z.literal("WEB_WIDGET"),
  }),
});

const SESSION_API_TIMEOUT_MS = 12_000;

export class VoiceSessionApiTimeoutError extends Error {}

export async function createWebVoiceSession(widgetKey: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SESSION_API_TIMEOUT_MS);
  try {
    // This route is deliberately outside clinic auth: the backend derives all
    // trusted tenant/location context from the opaque public widget key.
    const response = await publicApiRequest<unknown>("/voice/web/session", {
      method: "POST",
      body: JSON.stringify({ widgetKey }),
      signal: controller.signal,
    });
    const session = webVoiceSessionSchema.parse(response);
    return session satisfies WebVoiceSession;
  } catch (error) {
    if (controller.signal.aborted) throw new VoiceSessionApiTimeoutError();
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
