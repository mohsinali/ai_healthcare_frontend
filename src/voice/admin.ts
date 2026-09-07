export type WebVoiceChannelStatus = "ACTIVE" | "INACTIVE";

export interface WebVoiceChannel {
  id: string;
  locationId: string | null;
  location: {
    id: string;
    name: string;
    locationNumber: string;
    status: string;
  } | null;
  publicWidgetKey: string;
  allowedOrigins: string[];
  status: WebVoiceChannelStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ChannelList {
  data: WebVoiceChannel[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export function validateWebsiteOrigin(value: string): string | null {
  if (!value.trim()) return "Enter a website origin.";
  if (value.includes("*")) return "Wildcards are not allowed.";
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:")
      return "Use an HTTP or HTTPS origin.";
    if (url.username || url.password) return "Credentials are not allowed.";
    if (url.pathname !== "/" || url.search || url.hash)
      return "Enter only scheme://hostname[:port], without a path, query, or fragment.";
    return null;
  } catch {
    return "Enter a complete origin such as https://clinic.example.";
  }
}

export function canonicalizeOrigin(value: string) {
  return new URL(value.trim()).origin;
}

export function configuredLoaderBase(): string | null {
  const configured = process.env.NEXT_PUBLIC_WIDGET_LOADER_BASE_URL?.trim();
  if (!configured) return null;
  try {
    const url = new URL(configured);
    if (
      (url.protocol !== "https:" && url.protocol !== "http:") ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    )
      return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function installationSnippet(base: string, widgetKey: string) {
  return `<script\n  src="${base}/voice-widget/embed.js"\n  data-widget-key="${widgetKey}"\n  async\n></script>`;
}
