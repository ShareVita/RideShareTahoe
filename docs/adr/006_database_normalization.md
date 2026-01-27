# ADR 006: Database Normalization to 3rd Normal Form (3NF)

## Context

The initial database schema for RideShareTahoe included several violations of the Third Normal Form (3NF). Specifically:

1.  **Vehicle Data Duplication**: The `rides` table contained vehicle-specific columns (`car_type`, `has_awd`, `total_seats`) which led to data redundancy and update anomalies. Vehicle information should canonically reside in the `vehicles` table.
2.  **Flat Emergency Contacts**: The `user_private_info` table stored emergency contact details as flat columns (`emergency_contact_name`, `emergency_contact_number`, `emergency_contact_email`), restricting users to a single contact and mixing contact entity data with user private info.
3.  **Non-Atomic Values**: The `rides` table used a `recurring_days` array column, which violates 1NF (atomic values) and complicates querying for rides on specific days.

## Decision

We will normalize the database schema to at least 3NF to improve data integrity, reduce redundancy, and facilitate cleaner application logic.

### Key Technical Changes:

1.  **Extract Emergency Contacts**: Create a new `emergency_contacts` table with a foreign key to `profiles` (or `user_private_info`), allowing multiple contacts per user.
2.  **Link Rides to Vehicles**:
    - Add `vehicle_id` FK to the `rides` table.
    - Move `car_type` (renamed to `body_type` to distinguish from "ride" type), `total_seats` (renamed to `capacity`), and `has_awd` (covered by `drivetrain`) concepts fully to the `vehicles` table if they aren't already there.
    - **Dual-Write Strategy (Transitional)**: We will retain the legacy columns (`car_type`, `has_awd`, `total_seats`, `recurring_days`) in the `rides` table for a transitional period. The application will write to BOTH the new normalized tables/columns AND the legacy columns to ensure backward compatibility and zero downtime during deployment.
3.  **Normalize Recurring Days**:
    - Create `ride_recurrences` table to store day-of-week associations for recurring rides.
    - Drop `recurring_days` array from `rides`.

## Consequences

- **Positive**:
  - **Data Integrity**: Updates to a vehicle (e.g., getting a new car) automatically reflect on all future rides using that vehicle.
  - **Scalability**: Users can have multiple emergency contacts.
  - **Query Efficiency**: Searching for rides on "Monday" becomes a standard JOIN/WHERE rather than an array containment operation.
- **Negative**:
  - **Complexity**: Frontend forms for posting rides now require a two-step process (select/create vehicle -> post ride).
  - **Maintenance**: We must maintain dual-write logic in the application layer until the transition period is over and the legacy columns can be safely dropped.
  - **Migration**: Existing legacy data in `rides` that doesn't map to a `vehicle` record might need migration logic or will be left with null references (acceptable for this stage as we are in development).
- **Operational**:
  - ERDs in `docs/erd_changes.md` must be kept up to date.
