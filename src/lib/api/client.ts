const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly details?: unknown) { super(message); this.name = "ApiError"; }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!configuredBaseUrl) throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");
  const response = await fetch(`${configuredBaseUrl}${path.startsWith("/") ? path : `/${path}`}`, {
    ...init,
    headers: { Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers },
    signal: init.signal,
  });
  if (!response.ok) {
    const details = await response.json().catch(() => undefined);
    throw new ApiError("The API request failed", response.status, details);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
