import { z } from 'zod';

// Single ride schema
export const createRideSchema = z.object({
  posting_type: z.enum(['driver', 'passenger', 'flexible']).default('driver'),
  title: z.string().min(3, 'Title must be at least 3 characters').max(100),
  start_location: z.string().min(3, 'Start location must be at least 3 characters').max(100),
  end_location: z.string().min(3, 'End location must be at least 3 characters').max(100),
  departure_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  departure_time: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),
  return_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  return_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional()
    .nullable(),
  is_round_trip: z.boolean().default(false),
  trip_direction: z.enum(['departure', 'return']).optional().nullable(),
  round_trip_group_id: z.string().uuid().optional().nullable(), // Used for both round trips AND multi-date series
  is_recurring: z.boolean().default(false), // Set to true for multi-date series
  recurring_days: z.array(z.number()).optional().nullable(),
  price_per_seat: z.number().min(0).default(0),
  total_seats: z.number().min(1).max(10).default(1),
  available_seats: z.number().min(0).max(10).optional(),
  car_type: z.string().max(100).optional().nullable(),
  has_awd: z.boolean().default(false),
  description: z.string().max(500).optional().nullable(),
  special_instructions: z.string().max(500).optional().nullable(),
});

// Multi-date rides schema (array of rides)
export const createMultiRideSchema = z.array(createRideSchema).min(1);

// Union type that accepts either single or multiple rides
export const createRideOrMultiSchema = z.union([createRideSchema, createMultiRideSchema]);

// Update ride schema (for PATCH operations)
export const updateRideSchema = z.object({
  title: z.string().min(3).max(100).optional(),
  start_location: z.string().min(3).max(100).optional(),
  end_location: z.string().min(3).max(100).optional(),
  departure_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  departure_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  return_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  return_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional()
    .nullable(),
  is_round_trip: z.boolean().optional(),
  price_per_seat: z.number().min(0).optional(),
  total_seats: z.number().min(1).max(10).optional(),
  available_seats: z.number().min(0).max(10).optional(),
  car_type: z.string().max(100).optional().nullable(),
  has_awd: z.boolean().optional(),
  description: z.string().max(500).optional().nullable(),
  special_instructions: z.string().max(500).optional().nullable(),
  status: z.enum(['active', 'cancelled', 'completed']).optional(),
});

// Trip booking schemas (existing)
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
    .optional(),
  driver_notes: z.string().max(500).optional(),
});

// Type exports
export type CreateRideInput = z.infer<typeof createRideSchema>;
export type CreateMultiRideInput = z.infer<typeof createMultiRideSchema>;
export type UpdateRideInput = z.infer<typeof updateRideSchema>;
export type CreateTripBookingInput = z.infer<typeof createTripBookingSchema>;
export type UpdateTripBookingInput = z.infer<typeof updateTripBookingSchema>;
