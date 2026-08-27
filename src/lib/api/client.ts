const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(
  /\/$/,
  "",
);
let accessToken: string | null = null;
let refreshHandler: (() => Promise<string | null>) | null = null;
let refreshInFlight: Promise<string | null> | null = null;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function configureApiAuth(config: {
  refresh: () => Promise<string | null>;
}) {
  refreshHandler = config.refresh;
}
export function setApiAccessToken(token: string | null) {
  accessToken = token;
}

export function tenantApiRequest<T>(
  path: string,
  tenantId: string,
  init: RequestInit = {},
) {
  return apiRequest<T>(path, {
    ...init,
    headers: { ...init.headers, "X-Tenant-Id": tenantId },
  });
}

export function publicApiRequest<T>(
  path: string,
  init: RequestInit = {},
  diagnostics?: {
    onHttpStart?: () => void;
    onHttpResolved?: (status: number) => void;
    onBodyReading?: () => void;
    onBodyRead?: () => void;
  },
) {
  return request<T>(path, init, false, false, diagnostics);
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  return request<T>(path, init, true, retry);
}

async function request<T>(
  path: string,
  init: RequestInit,
  authenticated: boolean,
  retry: boolean,
  diagnostics?: {
    onHttpStart?: () => void;
    onHttpResolved?: (status: number) => void;
    onBodyReading?: () => void;
    onBodyRead?: () => void;
  },
): Promise<T> {
  if (!configuredBaseUrl)
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");
  diagnostics?.onHttpStart?.();
  const response = await fetch(
    `${configuredBaseUrl}${path.startsWith("/") ? path : `/${path}`}`,
    {
      ...init,
      credentials: authenticated ? "include" : "omit",
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(authenticated && accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : {}),
        ...init.headers,
      },
      signal: init.signal,
    },
  );
  diagnostics?.onHttpResolved?.(response.status);
  if (
    authenticated &&
    response.status === 401 &&
    retry &&
    refreshHandler &&
    !path.startsWith("/auth/")
  ) {
    refreshInFlight ??= refreshHandler().finally(() => {
      refreshInFlight = null;
    });
    if (await refreshInFlight) return apiRequest<T>(path, init, false);
  }
  diagnostics?.onBodyReading?.();
  const details = response.status === 204
    ? undefined
    : await response.json().catch((error) => {
        if (response.ok) throw error;
        return undefined;
      });
  diagnostics?.onBodyRead?.();
  if (!response.ok) {
    const message =
      typeof details === "object" && details && "message" in details
        ? String(details.message)
        : "The API request failed";
    throw new ApiError(message, response.status, details);
  }
  if (response.status === 204) return undefined as T;
  return details as T;
}
