# ElevenLabs official widget spike

This temporary, development-only page tests whether the official ElevenLabs
web widget can consume CareFlow's existing signed web voice session and dynamic
tool-header variables. It does not change the production voice implementation.

## Run locally

Set `NEXT_PUBLIC_VOICE_WIDGET_KEY` in the frontend local environment to the
existing public `wgt_` key. Configure the backend and Redis exactly as described
in `docs/voice/web-voice-elevenlabs-integration.md`, then start both applications.
Open `http://localhost:3000/voice-agent/widget-spike`. The route returns not
found in a production build.

The spike loads ElevenLabs' documented embed script:
`https://unpkg.com/@elevenlabs/convai-widget-embed`. It supplies the documented
`signed-url` and `dynamic-variables` attributes and deliberately omits
`agent-id`. Signed sessions are fetched only after the Initialize button is
pressed and an unused widget is removed before ElevenLabs' documented 15-minute
signed-URL expiry.

## Manual validation

1. Open browser developer tools, clear the Network list, and load the spike URL.
2. Confirm no `POST /api/v1/voice/web/session` request occurs on page load.
3. Click **Initialize ElevenLabs Widget** once. Confirm exactly one session POST
   succeeds and the official embed script loads from unpkg.
4. Confirm an `elevenlabs-convai` element exists with `signed-url` and without
   `agent-id`. Treat its attributes as credentials: do not copy, screenshot, or
   paste their values into tickets or logs.
5. Start a voice conversation promptly. A successful connection and an entry in
   ElevenLabs conversation history confirm that the widget accepted the signed
   URL for the authentication-enabled agent.
6. Ask the agent to perform a harmless read-only server-tool action that requires
   the selected clinic/location. In the CareFlow backend's redacted request logs,
   confirm the tool request was authenticated and accepted for the expected
   widget session/location. A successful tool response confirms that the secret
   dynamic variables populated the configured Authorization,
   `X-Voice-Widget-Key`, `X-Voice-Session-Token`, and
   `X-Voice-Selected-Location-Key` headers. Do not log raw header values.
7. Click **Destroy Widget** and confirm the widget disappears. Initialize again
   and confirm a new session POST occurs.

Code inspection alone is not compatibility proof. ElevenLabs currently
documents `signed-url` as an `agent-id` alternative, while the same widget page
also says widgets require public agents with authentication disabled. The manual
private-agent conversation above resolves that documentation ambiguity.

## Removal

Delete `src/app/voice-agent/widget-spike`,
`src/components/voice/elevenlabs-widget-spike.tsx`, its focused test, and this
note. No backend, Redis, SDK, database, or existing voice-card rollback is needed.
