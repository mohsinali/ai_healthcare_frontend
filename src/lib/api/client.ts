const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
let accessToken: string | null = null;
let refreshHandler: (() => Promise<string | null>) | null = null;
let refreshInFlight: Promise<string | null> | null = null;

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly details?: unknown) { super(message); this.name = "ApiError"; }
}

export function configureApiAuth(config: { refresh: () => Promise<string | null> }) { refreshHandler = config.refresh; }
export function setApiAccessToken(token: string | null) { accessToken = token; }

export function tenantApiRequest<T>(path: string, tenantId: string, init: RequestInit = {}) {
  return apiRequest<T>(path, { ...init, headers: { ...init.headers, "X-Tenant-Id": tenantId } });
}

export async function apiRequest<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  if (!configuredBaseUrl) throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");
  const response = await fetch(`${configuredBaseUrl}${path.startsWith("/") ? path : `/${path}`}`, {
    ...init,
    credentials: "include",
    headers: { Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}), ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...init.headers },
    signal: init.signal,
  });
  if (response.status === 401 && retry && refreshHandler && !path.startsWith("/auth/")) {
    refreshInFlight ??= refreshHandler().finally(() => { refreshInFlight = null; });
    if (await refreshInFlight) return apiRequest<T>(path, init, false);
  }
  if (!response.ok) {
    const details = await response.json().catch(() => undefined);
    const message = typeof details === "object" && details && "message" in details ? String(details.message) : "The API request failed";
    throw new ApiError(message, response.status, details);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
