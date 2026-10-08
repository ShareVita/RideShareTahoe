# Legacy ride coordinate backfill

The approved one-time production backfill on October 8, 2026 examined 292 rides.
It populated 252 missing latitude/longitude pairs on 199 rides: 134 starts and
118 ends. The remaining 93 rides had no accepted match for either endpoint.
These are approximate public-place points, not verified pickup addresses.

Only exact canonical public place names were submitted to Nominatim. Street
addresses, mixed locations, broad regions and ambiguous results were skipped.
Requests were sequential, cached and spaced four seconds apart. Private review
plans and caches are excluded from Git and must not be published.

`scripts/backfill-ride-coordinates.ts` is a manual operator tool, not a job.
Its `plan` and `apply` commands require an explicit production project reference,
certificate-verified database connection and private plan/cache paths. Planning
additionally requires an identifying Nominatim User-Agent and HTTPS Referer.
The reviewed population is capped at 292; it is not a general-purpose geocoder.

Application uses compare-and-set checks on both location texts, the original
timestamp and a completely missing coordinate pair. It cannot combine a new
axis with an existing one. One transaction disables only the timestamp trigger
under a table lock and restores it before commit. Native database tests cover
rollback, stale rows, partial pairs, timestamp preservation and repeat-run safety.

Post-write verification found all 292 rows still present, all non-coordinate
fields unchanged, and the timestamp trigger enabled. No accounts, deletion
requests, email settings or scheduled jobs were changed by the backfill.
