# Account deletion: retained shared history

Processing remains **disabled by default** (`ACCOUNT_DELETION_ENABLED=false`).
This change is not authorization to enable deletion, marketing, or scheduled mail.
No production migration or account deletion was performed during development.

## Identity and data contract

Migration `20261009000000_account_history_retention.sql` detaches the profile/Auth
foreign key. Hard GoTrue deletion runs a transactional Auth `AFTER DELETE` trigger:

- Retains an immutable `Deleted member` profile, with server-owned `deleted_at`,
  admin access removed and the member marked unavailable.
- Removes private Auth-owned rows by their existing cascades, socials, vehicles,
  owned blocks and pending review prompts involving the deleted member.
- Removes deleted authors' message/review/report text, profile personal fields,
  owned ride free text and coordinates, booking exact pickup locations and the
  deleted participant's notes. Other authors' text and shared parents remain.
- Cancels future pending/invited/confirmed bookings and retires all owned
  active availability; restores reserved seats on other posters' future rides.
  Past booking statuses remain unchanged: a past confirmed booking is **not** completed.

The Auth-maintenance exception requires the actual Auth database session (or
direct postgres), nested trigger execution, the transaction's retention marker,
and absence of the marked Auth user. It is not an authenticated-member bypass.
Existing member admin-grant and booking/review/message guards remain in place.
Profile inserts require live Auth IDs; even service-role writes cannot resurrect
a tombstone. Members cannot delete profiles directly.

A stable security-definer Auth existence lookup uses `auth.users`' primary-key
index, not profiles RLS. Restrictive authenticated policies gate affected member
tables and Storage writes. Surviving participants can still read retained rides
through bookings or conversations. New messaging, conversations, bookings and
invitations to a deleted counterpart are rejected at the database boundary.
Routes additionally return explanatory unavailable-member errors.

## Worker completion and recovery

The worker preserves due-date checks, 15-minute leases, original-status/timestamp
CAS and exact-claim fencing. It hard-deletes Auth first, then recursively lists
all owned `profile-photos/<uuid>/...` pages before removing Storage objects via
the Storage API. Only successful cleanup plus fenced completion reports success.

Storage failures, transport uncertainty and reclaimed-worker failures stay
`processing`, eligible for lease recovery. An initial explicit Auth 4xx rejection
can release its own claim; cleanup failure cannot reopen cancellation. Recovery
accepts Auth `user_not_found`, then repeats idempotent owned-object cleanup. A
worker which loses its completion fence does not report success.

## Local evidence and rollout prerequisites

Real local GoTrue/PostgREST fixtures cover three asymmetric members, deleted ride
poster, surviving-to-surviving conversation on the retained ride, authored versus
received messages/reviews, future cancellation, past confirmed status, stale
legitimate JWT reads/writes, profile forgery and tombstone resurrection denial.
Real Storage fixtures upload 102 objects including a nested path, inject cleanup
failure after Auth success, reject a stale JWT upload, reclaim an expired lease,
race duplicate workers and verify public object download fails after cleanup.

Local `storage.objects` constraints were inspected: only bucket FK and object PK,
no Auth-owner FK. The local Storage service was initially absent and was started
as a supervised isolated disposable service for these tests. Auth hard deletion
succeeded while owned physical objects remained; removal was verified separately
through Storage downloads. This is local evidence, not proof of production's
current schema or deployed GoTrue version.

Before rollout: review migration/guards against the deployed schema and GoTrue;
deploy migration and compatible application/worker together with flags still
off; reconcile pending/processing backlog and formerly cascaded history; confirm
Storage prefixes, object permissions and CDN cache retention; validate a staging
account end to end. Objects previously written outside owner-prefixed paths by
privileged tooling require a separate audited inventory. Public photo caches may
outlive origin object removal according to CDN caching rules.

Development evidence is in `.amp/in/artifacts/`: reviewed E2E video,
before/deleted desktop and narrow screenshots, surviving conversation draft,
and tombstone profile. The narrow capture is Chromium layout testing, not a
physical mobile device. UI sends were not submitted; database-only fixtures
prove unrelated messaging without invoking any real email provider.
