# ADR 003: Implementation of Open Social Profiles and Handshake Visibility

## Context

The founder’s vision for **RideShareTahoe** as a high-trust social community requires that users be able to verify one another via external social proof (e.g., Instagram, LinkedIn, Airbnb).

The platform is transitioning from a "Transactional Intent" model (requiring a specific ride post) to a **"Community Intent"** model. The act of authenticated registration and profile completion is now recognized as sufficient evidence of a user's intent to engage with the community (e.g., "chasing powder").

Currently, the `profile_socials` table is protected by a Row Level Security (RLS) policy that restricts visibility to users with a pre-existing transactional relationship (`has_active_booking_with`). This "Gate" must be moved from the **Booking** to the **Profile** to align with the new intent model.

## Decision

We will transition the reputation system to an **Authenticated Handshake** model. This permits greater visibility for legitimate community members while maintaining a technical barrier against unauthenticated scrapers and bad actors.

### Key Technical Changes:

1.  **Visibility Expansion**: Update the RLS policies for the `profile_socials` table. Visibility will no longer require a `trip_id`; instead, it will be granted to any `authenticated` user who is not `is_banned`.
2.  **Privacy Controls (Opt-Out)**: Update the `profiles` and `profile_socials` schema to include a `is_social_public` boolean. This provides a "Safety Valve" for users who prefer to remain in a restricted utility-only mode.
3.  **The "Handshake" Requirement**: To prevent passive lurking and data harvesting, social media links will only be visible to users who have **completed their own profiles** (e.g., uploaded a `profile_photo_url` and filled in a `bio`).
4.  **Scraping Mitigation**: Implement rate-limiting on the `api/community/profiles` route to prevent bulk collection of social handles. As a default, enforce a limit of **60 requests per minute per authenticated user** and **30 requests per minute per IP for unauthenticated traffic**, with clients exceeding these limits being blocked from this route for **15 minutes**. These thresholds MUST be configurable via environment or application settings but SHOULD remain at or below these defaults in production.

## Consequences

- **Positive**: Empowers users to perform their own social verification; reduces friction for establishing trust between members.
- **Negative**: Increases the project's risk profile regarding data privacy and automated stalking.
- **Engineering Requirement**: Requires the development of a profile **Settings** interface that allows users to manage social visibility and opt-out preferences.
