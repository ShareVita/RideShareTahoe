# ADR 004: Implementation of User-Level Exclusion (Blocking)

## Context

With the transition to an open community model (see ADR 001 and ADR 003), users now have the ability to contact others and view social proof without transactional prerequisites. This increased visibility necessitates a mechanism for users to unilaterally terminate interactions with specific individuals to prevent harassment and maintain personal safety.

While the administrative "Banning" system exists for platform-wide violations, a "Blocking" system is required for user-to-user interpersonal management.

## Decision

We will implement a **User-Level Exclusion System** using a dedicated `user_blocks` table.

### Key Technical Changes:

1.  **Exclusion Table**: Create `public.user_blocks` to store `blocker_id` and `blocked_id` pairs.
2.  **RLS Integration (Hard Exclusion)**:
    * **Messages/Conversations**: Update RLS policies to deny `INSERT` or `SELECT` operations if a record exists in `user_blocks` between the two parties.
    * **Social Profiles**: Update RLS on `profile_socials` to hide external links if the viewing user is blocked by the profile owner.
3.  **UI Implementation**:
    * Add a "Block User" action to the `MessageModal.tsx` and the user profile view.
    * Ensure the "Block" action is distinct from "Reporting".

### Business Logic Rules:

* **Unilateral Action**: A block does not require administrative approval.
* **Mutual Silencing**: A block is a "two-way mirror"; if User A blocks User B, neither can initiate contact with the other.
* **Preservation of Existing Data**: Blocking does not delete past messages but prevents future communication and real-time visibility.

## Consequences

* **Positive**: Provides immediate user agency; reduces the administrative load on the `ReportsTab` for interpersonal disputes.
* **Negative**: Increases the complexity of RLS policies across the database; requires careful handling in "Ride Search" to ensure blocked users do not accidentally book rides together.
* **Technical**: Every social/communication query now requires a sub-query or join against the `user_blocks` table, impacting read performance slightly.