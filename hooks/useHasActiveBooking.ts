import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Hook to check if the current user has an active booking with another user.
 * Returns true if there's a pending, confirmed, or invited trip_booking between the users.
 */
export function useHasActiveBooking(
  currentUserId: string | undefined,
  otherUserId: string | undefined
) {
  const [hasBooking, setHasBooking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUserId || !otherUserId || currentUserId === otherUserId) {
      setHasBooking(false);
      setIsLoading(false);
      return;
    }

    const supabase = createClient();

    const checkBooking = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('trip_bookings')
          .select('id, status')
          .or(
            `and(driver_id.eq.${currentUserId},passenger_id.eq.${otherUserId}),and(driver_id.eq.${otherUserId},passenger_id.eq.${currentUserId})`
          )
          .in('status', ['pending', 'confirmed', 'invited'])
          .maybeSingle();

        if (error) {
          console.error('Error checking booking:', error);
          setHasBooking(false);
        } else {
          setHasBooking(!!data);
        }
      } catch (error) {
        console.error('Error checking booking:', error);
        setHasBooking(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkBooking();
  }, [currentUserId, otherUserId]);

  return { hasBooking, isLoading };
}
