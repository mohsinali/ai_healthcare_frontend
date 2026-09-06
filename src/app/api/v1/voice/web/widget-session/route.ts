const BACKEND_PATH = "/voice/web/widget-session";
const FORWARDED_RESPONSE_HEADERS = [
  "access-control-allow-origin",
  "access-control-allow-methods",
  "access-control-allow-headers",
  "access-control-max-age",
  "cache-control",
  "content-type",
  "vary",
] as const;

export async function POST(request: Request) {
  return forward(request);
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  const requestedMethod = request.headers.get("access-control-request-method");
  const requestedHeaders = request.headers.get("access-control-request-headers");

  if (
    !origin ||
    !isHttpOrigin(origin) ||
    requestedMethod?.toUpperCase() !== "POST" ||
    !hasOnlyContentType(requestedHeaders)
  ) {
    return new Response(null, {
      status: 403,
      headers: { "Cache-Control": "no-store" },
    });
  }

  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "600",
      "Cache-Control": "no-store",
      Vary: "Origin",
    },
  });
}

async function forward(request: Request) {
  const apiBase = process.env.CAREFLOW_API_BASE_URL?.replace(/\/$/, "");
  if (!apiBase) {
    return new Response(null, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const origin = request.headers.get("origin");
  const headers = new Headers();
  if (origin) headers.set("Origin", origin);
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  const requestedMethod = request.headers.get("access-control-request-method");
  if (requestedMethod) {
    headers.set("Access-Control-Request-Method", requestedMethod);
  }
  const requestedHeaders = request.headers.get("access-control-request-headers");
  if (requestedHeaders) {
    headers.set("Access-Control-Request-Headers", requestedHeaders);
  }

  try {
    const upstream = await fetch(`${apiBase}${BACKEND_PATH}`, {
      method: request.method,
      headers,
      body: request.method === "POST" ? await request.text() : undefined,
      cache: "no-store",
    });
    const responseHeaders = new Headers();
    for (const name of FORWARDED_RESPONSE_HEADERS) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    responseHeaders.set("Cache-Control", "no-store");
    const hasBody = ![204, 205, 304].includes(upstream.status);
    return new Response(hasBody ? await upstream.arrayBuffer() : null, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return new Response(null, {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    });
  }
}

function isHttpOrigin(value: string) {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      url.origin === value &&
      url.username === "" &&
      url.password === ""
    );
  } catch {
    return false;
  }
}

function hasOnlyContentType(value: string | null) {
  if (!value) return true;
  const headers = value
    .split(",")
    .map((header) => header.trim().toLowerCase())
    .filter(Boolean);
  return headers.length > 0 && headers.every((header) => header === "content-type");
}
