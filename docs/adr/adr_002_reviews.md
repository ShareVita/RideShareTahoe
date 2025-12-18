# ADR 002: Preservation of Transactional Review System

## Context

While messaging is being opened to foster community interaction (see ADR 001), the integrity of the platform’s reputation system remains a priority. To prevent "review bombing" and maintain the value of verified driver/passenger ratings, we must decide whether to uncouple reviews from formal ride posts.

## Decision

The review system will remain strictly **Transactional**.

### Constraints:

1.  **Schema Integrity**: The `reviews` table will retain the `NOT NULL` constraint on the `trip_id` (or `booking_id`) column.
2.  **Verification Gate**: A review can only be submitted if it is linked to a valid, completed `trip_booking`.
3.  **Safety Decoupling**: Because social interactions will now occur without a formal ride post via open messaging, user safety concerns (harassment/spam) must be handled via the **User Reporting** system (`reports` table) rather than the Review system. This ADR treats the User Reporting system and underlying `reports` table as required safety infrastructure; if they do not yet exist in a given deployment, they MUST be implemented or integrated as a prerequisite dependency.

## Consequences

- **Positive**: Protects the platform’s high-trust star ratings; ensures that "Driver" and "Passenger" scores are based solely on verified travel history.
- **Negative**: Creates a "shadow economy" where social-only interactions (e.g., meeting to plan a trip) are not rateable within the formal system.
- **Mitigation**: The `ReportModal` UI component (to be created or updated as needed) will be the primary tool for flagging misconduct that occurs outside of a booked ride and will integrate with the reporting changes defined in **ADR 001** (e.g., attaching `conversation_id` to new reports initiated from conversations).
