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

## Visitor experience

The loader adds a polished **Talk to our assistant** launcher fixed 24 pixels
from the bottom-right of the viewport. It is isolated in Shadow DOM, so customer
website button styles and box-sizing rules cannot alter it, and it does not add
global CSS or take up space in the page layout. On narrow screens it becomes a
52-pixel circular microphone control, uses smaller safe-area-aware edge spacing,
and retains the same accessible name.

Activating the launcher changes it to a disabled **Connecting…** state while the
secure session and official ElevenLabs component load. On success the CareFlow
launcher is hidden and the official ElevenLabs panel appears. On failure, a
privacy-safe unavailable message and a deliberate **Try again** action are
shown; there is no automatic retry.

The launcher is a semantic button with a visible keyboard focus indicator,
Enter and Space activation, a 44-pixel-or-larger touch target, live loading and
failure announcements, and reduced-motion support. Loading the page never
starts a call, plays audio, or requests microphone access. Session bootstrap
still requires the visitor to activate the CareFlow launcher, and call or
microphone initiation remains a deliberate interaction with the official
ElevenLabs interface. No custom CSS or additional assets are required.

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

# Administration

Web Voice Channel management is available only to CareFlow Super Admins. A Super Admin opens a tenant and selects **Voice Assistant** (`/tenants/<tenant-id>/voice-assistant`) to perform setup for the client. Clinic owners, clinic administrators, receptionists, and other clinic users cannot view or configure channels or installation details. The API remains the authority for role checks and tenant isolation.

Add each exact website origin using `scheme://hostname[:port]`, select an active location, save, and enable the channel. `www` and non-`www`, HTTP and HTTPS, and different ports are distinct origins; paths, queries, fragments, credentials, and wildcards are rejected. An empty allowlist blocks embedding.

The installation snippet uses `NEXT_PUBLIC_WIDGET_LOADER_BASE_URL` as the controlled public origin serving `/voice-widget/embed.js`. Set this to an origin only (for example `https://app.careflow.example`) in production. When unset in local development, the page safely uses its browser origin after hydration. It never uses the backend-only `CAREFLOW_API_BASE_URL` and withholds the snippet when no valid base is available.

The `wgt_…` widget key in the copied script is intentionally public and is still protected by exact-origin authorization. It is not an ElevenLabs API key, gateway credential, signed URL, or session token. Never put private credentials on the clinic website. Widget-key rotation is not currently supported. Installed widgets remain public runtime clients and never require Super Admin authentication.

New tenants do not receive a copied loader. They receive an inactive database
channel with a server-generated public key, no location, and an empty origin
allowlist. A Super Admin completes the tenant readiness checklist, associates a
real location, configures exact origins, and enables the channel before using
the dynamically generated installation snippet. Clinic roles cannot access
provisioning status, widget keys, snippets, or channel management.
