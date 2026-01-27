-- Migration: 3NF Normalization (Optimized)
-- Description: Normalize schema for 3NF compliance with performance and security fixes.

-- 1. EMERGENCY CONTACTS
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_private_info(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone_number TEXT,
  email TEXT,
  relation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Prevent duplicate migration entries if the script is re-run
  CONSTRAINT unique_user_contact_name UNIQUE(user_id, name)
);

-- Index for RLS and query performance
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user_id ON emergency_contacts(user_id);

ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;

-- Using auth.uid() directly is more performant than (SELECT auth.uid())
CREATE POLICY "Users can view their own emergency contacts" 
  ON emergency_contacts FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own emergency contacts" 
  ON emergency_contacts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own emergency contacts" 
  ON emergency_contacts FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own emergency contacts" 
  ON emergency_contacts FOR DELETE USING (auth.uid() = user_id);

-- Migrate existing data with conflict handling
INSERT INTO emergency_contacts (user_id, name, phone_number, email)
SELECT id, emergency_contact_name, emergency_contact_number, emergency_contact_email
FROM user_private_info
WHERE emergency_contact_name IS NOT NULL
ON CONFLICT (user_id, name) DO NOTHING;



-- 2. VEHICLES UPDATES
ALTER TABLE vehicles
ADD COLUMN IF NOT EXISTS body_type TEXT,
ADD COLUMN IF NOT EXISTS capacity INTEGER;


-- 3. RIDE RECURRENCES
CREATE TABLE IF NOT EXISTS ride_recurrences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_id UUID REFERENCES rides(id) ON DELETE CASCADE NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ride_recurrences_ride_id ON ride_recurrences(ride_id);

ALTER TABLE ride_recurrences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view ride recurrences" 
  ON ride_recurrences FOR SELECT USING (true);

-- Added UPDATE policy and streamlined EXISTS checks
CREATE POLICY "Ride posters can insert recurrences" 
  ON ride_recurrences FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM rides WHERE id = ride_id AND poster_id = auth.uid())
  );

CREATE POLICY "Ride posters can update recurrences" 
  ON ride_recurrences FOR UPDATE USING (
    EXISTS (SELECT 1 FROM rides WHERE id = ride_id AND poster_id = auth.uid())
  );
  
CREATE POLICY "Ride posters can delete recurrences" 
  ON ride_recurrences FOR DELETE USING (
    EXISTS (SELECT 1 FROM rides WHERE id = ride_id AND poster_id = auth.uid())
  );


-- 4. RIDES UPDATES
ALTER TABLE rides
ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_rides_vehicle_id ON rides(vehicle_id);

-- Ensure rides(poster_id) is indexed to support the RLS EXISTS clauses above
CREATE INDEX IF NOT EXISTS idx_rides_poster_id ON rides(poster_id);



-- 5. TRIGGERS
-- Assumes update_updated_at_column() exists in the schema
CREATE TRIGGER update_emergency_contacts_updated_at 
BEFORE UPDATE ON emergency_contacts 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
