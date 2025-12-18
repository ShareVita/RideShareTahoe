# ADR 001: Implementation of Open Messaging and Social Discovery

## Context

RideShareTahoe was initially architected as an intent-based utility, requiring an active ride post or booking (`has_active_booking_with`) to initiate communication. To facilitate community growth and allow "powder chasers" to connect before a formal ride is posted, the platform is transitioning to a **"Community Intent"** model. The act of authenticated registration and profile completion is recognized as sufficient evidence of a user's intent to engage with the community.

## Decision

We will remove all transactional barriers from the messaging and conversation workflows.

### Key Technical Changes:

1.  **RLS Policy Update**: Modify Row Level Security (RLS) on `conversations` and `messages` tables to remove the `has_active_booking_with` requirement. Access will now be granted to any `authenticated` user who is not `is_banned`.
2.  **Logic Removal**: Deprecate the `useHasActiveBooking` hook and its implementation in `MessageModal.tsx` and `useMessageModal.ts`.
3.  **Mandatory Safety Mitigations**:
    * **Rate Limiting**: Implement server-side rate limiting on the `api/messages` route to prevent automated spam and bulk unsolicited outreach.
    * **User Blocking**: Implement a unilateral exclusion system to allow users to manage interpersonal interactions. **Refer to ADR 004 for the technical specification and implementation of the blocking system.**
    * **Reporting Context**: Extend the `reports` table schema with optional `conversation_id` and `message_id` fields (foreign keys to `conversations.id` and `messages.id`) so that individual reports can reference specific evidence during moderation reviews.

## Consequences

* **Positive**: Significant reduction in user friction for discovery; enables the "Social" vision for the platform while keeping safety nets automated.
* **Negative**: Increased exposure to spam; requires rigorous enforcement of the mitigations defined in ADR 004.
* **Operational**: Higher dependency on the `ReportsTab` admin interface for handling user conduct disputes.