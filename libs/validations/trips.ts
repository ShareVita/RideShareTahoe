import { z } from 'zod';

export const createTripBookingSchema = z.object({
  ride_id: z
    .string()
    .regex(
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
      'Invalid UUID format'
    ),
  pickup_location: z.string().min(3, 'Pickup location must be at least 3 characters').max(100),
  pickup_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  pickup_time: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
  passenger_notes: z.string().max(500).optional(),
});

export const updateTripBookingSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed', 'invited']).optional(),
  pickup_location: z.string().min(3).max(100).optional(),
  pickup_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(), // Assuming time part of timestamp or just time string
  driver_notes: z.string().max(500).optional(),
});

export type UpdateTripBookingInput = z.infer<typeof updateTripBookingSchema>;
