-- Preserve known drive types while allowing the combined self-reported checkbox.
ALTER TABLE public.vehicles DROP CONSTRAINT vehicles_drivetrain_check;
ALTER TABLE public.vehicles ADD CONSTRAINT vehicles_drivetrain_check
  CHECK (drivetrain IN ('FWD', 'RWD', 'AWD', '4WD', 'AWD/4WD'));
