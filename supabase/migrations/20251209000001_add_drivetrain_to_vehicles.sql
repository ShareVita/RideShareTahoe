ALTER TABLE vehicles 
ADD COLUMN drivetrain text CHECK (drivetrain IN ('FWD', 'RWD', 'AWD', '4WD'));
