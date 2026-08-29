# ElevenLabs FAQ webhook tool

This Stage 1 tool is read-only. It searches approved `ACTIVE` FAQ records and cannot access or mutate patients, appointments, locations, or voice context.

## Runtime trust path

```text
Browser publicWidgetKey
  -> ElevenLabs dynamic variable secret__voice_widget_key
  -> webhook header X-Voice-Widget-Key
  -> WebVoiceChannelResolverService
  -> trusted VoiceContext
  -> VoiceFaqService
  -> ACTIVE tenant/location-approved answers
```

The widget key is a public routing identifier, not authentication. `VOICE_GATEWAY_API_KEY` authenticates ElevenLabs as an approved machine caller; widget-key re-resolution establishes tenant and optional location context. Neither the LLM nor the request body may provide `tenantId`, `locationId`, or the widget key.

## Dashboard setup

ElevenLabs calls webhook tools from its own infrastructure, so the backend URL must be public HTTPS. `http://localhost:3001` cannot work. For development, use an already deployed development backend or a secure Cloudflare Tunnel/ngrok URL. Do not weaken TLS or global CORS; this is a server-to-server request.

In the ElevenLabs dashboard:

1. Open the current development Agent and add a **Webhook Tool**.
2. Name it `search_clinic_faq`.
3. Use this description: “Search the clinic's approved FAQ knowledge for factual questions such as hours, parking, insurance, services, preparation instructions, policies, and general clinic information. Use this tool instead of guessing clinic-specific facts.”
4. Set method to `POST`.
5. Set URL to `https://<backend-public-host>/api/v1/voice/tools/faq-search`.
6. Configure `Authorization` as `Bearer <VOICE_GATEWAY_API_KEY>` using an ElevenLabs Secret/authentication mechanism. Store the real value only in the dashboard secret facility; never put it in source, documentation, prompts, or browser variables.
7. Add header `X-Voice-Widget-Key`, choose **Dynamic variable** as its value type, and create/select `secret__voice_widget_key`. The equivalent template reference is `{{secret__voice_widget_key}}`. `WebVoiceCard` supplies this variable at conversation startup. ElevenLabs reserves the `secret__` prefix for values usable in webhook headers but not sent to the LLM prompt or first message.
8. Define exactly one body parameter:
   - name: `query`
   - type: `string`
   - required: yes
   - description: “A concise search query representing the caller's clinic-information question. Use important terms such as parking, Aetna insurance, opening hours, or what to bring.”
9. Do not add parameters named `tenantId`, `locationId`, `widgetKey`, `apiKey`, `agentId`, `patientId`, or `faqId`.
10. Attach the tool to the development Agent and save/publish the Agent configuration as required by the dashboard.

Expected request:

```http
POST /api/v1/voice/tools/faq-search
Authorization: Bearer <VOICE_GATEWAY_API_KEY>
X-Voice-Widget-Key: {{secret__voice_widget_key}}
Content-Type: application/json

{"query":"parking"}
```

Successful match:

```json
{
  "found": true,
  "matches": [
    {
      "question": "Is parking available?",
      "answer": "Free parking is available behind the clinic.",
      "scope": "LOCATION"
    }
  ]
}
```

No approved match is `{ "found": false, "matches": [] }`. An unresolved tenant-wide context may additionally return `"requiresLocation": true` when a similar approved location-specific FAQ exists.

## Agent prompt addition

Add this compact guidance to the Agent prompt:

> For clinic-specific factual questions, call `search_clinic_faq`; never guess clinic-specific facts. Answer only from approved FAQ results. If `found` is false, say the information is unavailable. If `requiresLocation` is true, ask which clinic location the caller means. Keep answers concise and natural, and never read JSON metadata or mention records, IDs, tools, APIs, or implementation details.

## Real verification

Use synthetic/demo data only.

1. Start the backend and frontend.
2. expose the backend through public HTTPS or use the deployed development backend.
3. Configure `search_clinic_faq` as above, including the machine Authorization secret and dynamic widget-key header.
4. Attach it to the development Agent and add the prompt guidance.
5. Start a browser voice call and ask an existing FAQ, such as “Do you have parking?”
6. Confirm ElevenLabs invokes the tool, the backend returns an approved answer, and the Agent speaks that answer naturally.
7. Repeat with an inactive FAQ, another tenant's FAQ, another location's FAQ, an unknown question, a tenant-wide FAQ, and a matching current-location FAQ.
8. Confirm inactive/cross-tenant/cross-location answers never appear, unknown questions are not invented, and unresolved location-dependent questions ask for location when `requiresLocation` is true.

The current Nest throttler allows 60 tool calls per minute per application instance. It is in-process and therefore not a distributed production rate limit.

Dashboard terminology and secret-variable behavior were verified against the official [Webhook tools](https://elevenlabs.io/docs/eleven-agents/customization/tools/webhook-tools) and [Dynamic variables](https://elevenlabs.io/docs/eleven-agents/customization/personalization/dynamic-variables) documentation.
