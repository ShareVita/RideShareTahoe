# ADR 003: Implementation of Open Social Profiles and Handshake Visibility

## Context

The founder’s vision for **RideShareTahoe** as a high-trust social community requires that users be able to verify one another via external social proof (e.g., Instagram, LinkedIn, Airbnb).

The platform is transitioning to a **"Community Intent"** model, where authenticated registration and profile completion are recognized as sufficient evidence of a user's intent to engage. This move requires shifting visibility gates from the **Booking** to the **Profile**.

## Decision

We will transition the reputation system to an **Authenticated Handshake** model. This permits greater visibility for legitimate community members while maintaining a technical barrier against unauthenticated scrapers and bad actors.

### 1. Definition of a "Complete Profile" (The Handshake Bar)

To satisfy the "Handshake" requirement and view the social links of other members, a user's own profile must meet the following validation standards established in `ProfileForm.tsx`:

- **Identity Verification**: Presence of both `first_name` and `last_name`.
- **Verified Location**: Completion of a full address (`street_address`, `city`, `state`, `zip_code`) and successful geocoding resulting in valid `display_lat` and `display_lng` coordinates.
- **Social Reciprocity**: The user must have provided at least one of their own social media links (Facebook, Instagram, LinkedIn, or Airbnb).
- **Visual Trust (Recommended)**: Upload of a `profile_photo_url` and completion of a `bio` to facilitate "vibe checks".

### 2. Key Technical Changes:

- **Visibility Expansion**: Update RLS on `profile_socials` to grant access to `authenticated` users who are not `is_banned` and meet the "Complete Profile" criteria.
- **Privacy Controls (Opt-Out)**: Add an `is_social_public` boolean to the `profiles` table. This provides a "Safety Valve" for users to remain in restricted mode.
- **UI Enforcement**: Use the `useProfileCompletionPrompt` hook to block access to others' social data until the user's own profile is validated.
- **Scraping Mitigation**: Implement strict rate-limiting on the `api/community/profiles` route per ADR 005.

## Consequences

- **Positive**: Empowers users to perform their own social verification; ensures that those viewing sensitive social data have also shared their own.
- **Negative**: Increases the project's risk profile regarding data privacy; requires ongoing maintenance of the geocoding/verification layer.
- **Technical Integrity**: Ensures the `CompleteProfilePage` redirection logic is tied to a "Verified" state rather than just the presence of a name.
