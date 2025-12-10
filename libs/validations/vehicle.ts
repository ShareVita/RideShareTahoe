import { z } from 'zod';

export const vehicleSchema = z.object({
  make: z
    .string()
    .min(1, 'Make is required')
    .max(50, 'Make must be less than 50 characters')
    .regex(/^[a-zA-Z0-9\s]+$/, 'Make can only contain letters, numbers, and spaces'),
  model: z
    .string()
    .min(1, 'Model is required')
    .max(50, 'Model must be less than 50 characters')
    .regex(/^[a-zA-Z0-9\s]+$/, 'Model can only contain letters, numbers, and spaces'),
  year: z
    .number()
    .int()
    .min(1900, 'Year must be after 1900')
    .max(new Date().getFullYear() + 1, 'Year cannot be in the future'),
  color: z
    .string()
    .min(1, 'Color is required')
    .max(50, 'Color must be less than 50 characters')
    .regex(/^[a-zA-Z0-9\s]+$/, 'Color can only contain letters, numbers, and spaces'),
  license_plate: z
    .string()
    .max(20, 'License plate must be less than 20 characters')
    .regex(
      /^[a-zA-Z0-9\s-]*$/,
      'License plate can only contain letters, numbers, spaces, and dashes'
    )
    .optional()
    .or(z.literal('')),
  drivetrain: z.enum(['FWD', 'RWD', 'AWD', '4WD']).optional(),
});

export type VehicleSchema = z.infer<typeof vehicleSchema>;
