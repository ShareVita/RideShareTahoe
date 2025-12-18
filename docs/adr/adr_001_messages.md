# ADR 001: Implementation of Open Messaging and Social Discovery

## Context

The platform is transitioning from a "Transactional Intent" model (requiring a specific ride post) to a "Community Intent" model. The act of authenticated registration and profile completion is now recognized as sufficient evidence of a user's intent to engage with the community (e.g., "chasing powder").

## Decision

We will remove all transactional barriers from the messaging and conversation workflows.

### Key Technical Changes:

1.  **RLS Policy Update**: Modify Row Level Security (RLS) on `conversations` and `messages` tables to remove the `has_active_booking_with` requirement. Access will now be granted to any `authenticated` user who is not `is_banned`.
2.  **Logic Removal**: Deprecate the `useHasActiveBooking` hook in `MessageModal.tsx` and `useMessageModal.ts`.
3.  **Mandatory Safety Mitigations**:
    - **Rate Limiting**: Implement server-side rate limiting on the `api/messages` route to prevent automated spam and bulk unsolicited outreach.
    - **User Blocking**: Introduce a `user_blocks` table to allow users to self-moderate and immediately terminate unwanted contact.
    - **Reporting context**: Extend the `reports` table schema with an optional `conversation_id` field (foreign key to `conversations.id`) so that individual reports can reference the specific conversation being reviewed.

## Consequences

- **Positive**: Reduced friction for user connection; enables future "Social" features; aligns with the founder's community-first vision.
- **Negative**: Increased exposure to spam and harassment; requires active engineering of "Soft Safety" (blocking/reporting) to replace "Hard Safety" (booking gates).
