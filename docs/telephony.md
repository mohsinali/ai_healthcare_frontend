# Telephony configuration

Telephony lets clinic owners and administrators configure globally unique inbound phone numbers. A number belongs to the current tenant and can apply to **All Locations** or one **Specific Location**. The dialed number will later let the backend resolve the trusted tenant and optional location for inbound voice calls.

Each record stores the provider (currently Twilio), an optional provider reference reserved for future provider-side identifiers, and an Active or Inactive lifecycle status. Clinic owners and clinic administrators can create, edit, activate, and deactivate records; receptionists have read-only list and detail access.

This module is SaaS-side configuration only. It does not connect to Twilio or ElevenLabs and does not place, receive, or route calls. The backend—not an LLM—remains the tenant-routing authority.
