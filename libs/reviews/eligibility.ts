import { tahoeDateTime } from '@/lib/dateFormat';

/** Eligibility is not evidence of completion and never changes booking status. */
export function isReviewableBooking(
  booking: {
    status: string;
    ride: { departure_date: string; departure_time: string } | null;
  },
  now = new Date()
): boolean {
  if (!['confirmed', 'completed'].includes(booking.status) || !booking.ride) return false;
  const departure = tahoeDateTime(booking.ride.departure_date, booking.ride.departure_time);
  return departure !== null && departure < now;
}
