-- Migration: Privacy & Logic Fixes
-- Description: Add private columns for exact addresses to separate them from public display locations.
-- Compliance: 3NF - Addresses are direct attributes of the Ride entity.

-- 1. Add private address columns
ALTER TABLE rides
ADD COLUMN IF NOT EXISTS start_address_street TEXT,
ADD COLUMN IF NOT EXISTS end_address_street TEXT;


