# External website voice widget

## Installation

Add the loader to the customer website with the channel's public widget key:

```html
<script
  src="https://<careflow-frontend-domain>/voice-widget/embed.js"
  data-widget-key="wgt_..."
  async
></script>
```

The `wgt_` value is a public routing identifier, not a secret. Each channel must
still be restricted to its explicitly configured embedding origins.

## Architecture and security

`public/voice-widget/embed.js` is a dependency-free loader at a stable public
URL. It derives its bootstrap URL from the origin of its own script and calls
the same-origin `/api/v1/voice/web/widget-session` proxy. That narrow, no-store
Next.js route forwards to the server-controlled `CAREFLOW_API_BASE_URL`; customer
markup cannot select the backend destination.

The browser's real `Origin` is preserved through the proxy. The backend resolves
the channel and active tenant from the widget key, normalizes the request origin,
and authorizes an exact match against that channel's `allowedOrigins`. Missing,
malformed, and unauthorized origins fail closed with the same generic response.
CORS determines whether a browser may read a response; it does not replace the
backend's origin authorization.

The loader requests a session only after a visitor gesture. It loads the official
ElevenLabs embed from `https://unpkg.com/@elevenlabs/convai-widget-embed`, creates
an `<elevenlabs-convai>` element, and sets `signed-url` plus dynamic variables
before attaching the element. It never supplies `agent-id`.

Signed URLs, session tokens, gateway credentials, and provider secrets must not
be put in customer markup, public environment variables, URLs, browser storage,
analytics, console output, screenshots, or support tickets. The loader uses
credential-less cross-origin requests and presents only a generic failure state.

## Configuration

Set the frontend deployment's server-only backend destination:

```dotenv
CAREFLOW_API_BASE_URL=https://<careflow-backend-domain>/api/v1
```

Do not prefix it with `NEXT_PUBLIC_`. The backend separately requires its normal
database, Redis, ElevenLabs, and voice-gateway secret configuration.

Configure each channel's complete allowed-origin list through the authenticated
channel administration endpoint (or an equivalent tenant-scoped administration
tool). Origins use only `scheme://hostname[:port]`; paths, queries, fragments,
credentials, wildcards, suffix matching, and implicit subdomains are rejected.
An empty list permits no external embedding.

## Troubleshooting

- A generic unavailable state can indicate an unknown widget key, an inactive
  channel or tenant, an absent or invalid `Origin`, a disallowed origin, an
  unavailable bootstrap service, or an invalid upstream response. Inspect
  redacted server diagnostics; do not expose credential-bearing responses.
- Ensure the script is served from the CareFlow frontend domain and that
  `CAREFLOW_API_BASE_URL` includes the backend `/api/v1` prefix.
- Add every legitimate production origin explicitly, including its scheme and
  non-default port. Do not loosen the policy to solve a CORS error.
- ElevenLabs server tools require a publicly reachable HTTPS backend endpoint;
  browser CORS settings do not govern those server-to-server requests.
- External bootstrap throttling is process-local. Use a distributed limiter
  before horizontally scaling the production deployment.

After configuration, verify a real conversation and tool call, refresh and
start a second session, confirm a non-allowed origin fails generically, and
confirm the existing `/voice-agent/test` flow still works.
