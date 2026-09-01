# ElevenLabs FAQ webhook tool

This Stage 1 tool is read-only. It searches approved `ACTIVE` FAQ records and cannot access or mutate patients, appointments, locations, or voice context.

## Runtime trust path

```text
Browser publicWidgetKey
  -> ElevenLabs dynamic variable secret__voice_widget_key
  -> webhook header X-Voice-Widget-Key
  -> WebVoiceChannelResolverService
  -> trusted VoiceContext
Conversation selected_location_key
  -> webhook header X-Voice-Selected-Location-Key
  -> same-tenant ACTIVE locationNumber validation
  -> VoiceFaqService
  -> ACTIVE tenant/location-approved answers
```

The widget key is a public routing identifier, not authentication. `VOICE_GATEWAY_API_KEY` authenticates ElevenLabs as an approved machine caller; widget-key re-resolution establishes tenant and optional default location context. Neither the LLM nor the request body may provide `tenantId`, `locationId`, the widget key, or the selected location key. `selected_location_key` is an untrusted conversation reference until the backend confirms that its `locationNumber` belongs to the trusted tenant and is `ACTIVE`.

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
8. Add header `X-Voice-Selected-Location-Key`, choose **Dynamic variable**, and select `selected_location_key` (`{{selected_location_key}}`). This is not a Secret or an LLM-supplied body parameter. Leave it empty while location is unresolved. Successful `resolve_location` response assignments update it, so later FAQ calls automatically use the current selection.
9. Define exactly one body parameter:
   - name: `query`
   - type: `string`
   - required: yes
   - description: “A concise search query representing the caller's clinic-information question. Use important terms such as parking, Aetna insurance, opening hours, or what to bring.”
10. Do not add parameters named `tenantId`, `locationId`, `widgetKey`, `selected_location_key`, `apiKey`, `agentId`, `patientId`, or `faqId`.
11. Attach the tool to the development Agent, save it, and **publish the Agent changes**. Live application sessions do not use unpublished tool/header configuration.

Expected request:

```http
POST /api/v1/voice/tools/faq-search
Authorization: Bearer <VOICE_GATEWAY_API_KEY>
X-Voice-Widget-Key: {{secret__voice_widget_key}}
X-Voice-Selected-Location-Key: {{selected_location_key}}
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

FAQ scope order is: tenant from the trusted widget-key context; valid conversation-selected location; default VoiceContext location; then tenant-wide only. A missing or blank selected-location header uses the default. A non-empty unknown, inactive, or other-tenant key is rejected with the same safe response and cannot switch tenants.

## Agent System Prompt

The complete production ElevenLabs System Prompt, including FAQ behavior, is maintained in [ElevenLabs System Prompt](./elevenlabs-system-prompt.md). Copy that single prompt block; do not add a separate FAQ prompt fragment.

## Real verification

Use synthetic/demo data only.

1. Start the backend and frontend.
2. expose the backend through public HTTPS or use the deployed development backend.
3. Configure `search_clinic_faq` as above, including the machine Authorization secret and both dynamic widget and selected-location headers, then publish the Agent.
4. Attach it to the development Agent and install the canonical [ElevenLabs System Prompt](./elevenlabs-system-prompt.md).
5. Start a browser voice call and ask an existing FAQ, such as “Do you have parking?”
6. Confirm ElevenLabs invokes the tool, the backend returns an approved answer, and the Agent speaks that answer naturally.
7. With a Clifton-default widget, call the API without the selected header and confirm Clifton scope; repeat with Gulshan's `locationNumber` and confirm Gulshan plus tenant-wide scope.
8. Confirm another tenant's, an inactive, and an unknown `locationNumber` are rejected identically; unrelated-location answers never appear.
9. After backend checks pass, perform one browser call: select Clifton, ask a location-specific FAQ, switch to Gulshan, and ask it again. Confirm the answer changes without repeating the location.

The current Nest throttler allows 60 tool calls per minute per application instance. It is in-process and therefore not a distributed production rate limit.

Dashboard terminology and secret-variable behavior were verified against the official [Webhook tools](https://elevenlabs.io/docs/eleven-agents/customization/tools/webhook-tools) and [Dynamic variables](https://elevenlabs.io/docs/eleven-agents/customization/personalization/dynamic-variables) documentation.
