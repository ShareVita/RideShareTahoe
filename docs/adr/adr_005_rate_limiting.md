# ADR 005: Implementation of Unified Rate Limiting Infrastructure

## Context

As RideShareTahoe transitions to an open community model, the platform faces increased risks from automated spam (Messaging) and data harvesting (Social Profiles).

Currently, the codebase contains two redundant in-memory rate-limiting utilities: `lib/ratelimit.ts` and `libs/rateLimit.ts`. Both implementations utilize in-memory storage, which is insufficient for serverless environments where state is not preserved across execution contexts.

## Decision

We will standardize on a single, unified rate-limiting service to protect the platform's resources and user data.

### Key Technical Changes:

1.  **Consolidation**: Deprecate `lib/ratelimit.ts` in favor of the factory-based implementation in `libs/rateLimit.ts`.
2.  **Infrastructure Evolution**: The current in-memory `Map` storage is accepted as a short-term solution for development. However, for production deployment, the implementation must be refactored to support a **persistent backend (e.g., Upstash Redis)** to ensure limits are enforced across distributed serverless instances.
3.  **Tiered Enforcement**:
    - **Auth Tier**: 5 attempts per 15 minutes (Critical).
    - **Messaging Tier**: 10 messages per minute (Spam Mitigation).
    - **Discovery Tier**: 100 profile views per 15 minutes (Anti-Scraping).

### Implementation Requirements:

- **Key Generation**: Use a combination of `auth.uid()` (for authenticated users) and IP address (for anonymous traffic) to prevent bypass through account switching or proxy usage.
- **Headers**: The API must return standard `RateLimit-*` headers (e.g., `Retry-After`) to provide clear feedback to clients when limits are hit.

## Consequences

- **Positive**: Provides a consistent security baseline across all public-facing APIs; simplifies the implementation of safety requirements defined in ADR 001 and ADR 003.
- **Negative**: Introduction of an external dependency (Redis) for production persistence; slight increase in API latency due to the round-trip for limit verification.
