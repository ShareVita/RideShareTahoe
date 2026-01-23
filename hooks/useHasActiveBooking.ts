'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/libs/supabase';

/**
 * Hook to check if the current user has an active booking with another user.
 * Returns true if there's a pending, confirmed, or invited trip_booking between the users.
 *
 * Optimized to use a single query with .or() instead of two sequential queries.
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

    // Validate UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(currentUserId) || !uuidRegex.test(otherUserId)) {
      console.error('Invalid UUID format:', { currentUserId, otherUserId });
      setHasBooking(false);
      setIsLoading(false);
      return;
    }

    let isCancelled = false;

    const checkBooking = async () => {
      setIsLoading(true);
      try {
        // Combined query: check both directions in a single request
        // Direction 1: currentUser is driver, otherUser is passenger
        // Direction 2: otherUser is driver, currentUser is passenger
        const { data: booking, error } = await supabase
          .from('trip_bookings')
          .select('id')
          .in('status', ['pending', 'confirmed', 'invited'])
          .or(
            `and(driver_id.eq.${currentUserId},passenger_id.eq.${otherUserId}),` +
              `and(driver_id.eq.${otherUserId},passenger_id.eq.${currentUserId})`
          )
          .limit(1)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          // PGRST116 is "no rows found" which is fine
          console.error('Error checking booking:', {
            error,
            message: error.message,
            code: error.code,
          });
        }

        if (!isCancelled) {
          setHasBooking(!!booking);
        }
      } catch (error) {
        console.error('Unexpected error checking booking:', error);
        if (!isCancelled) {
          setHasBooking(false);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    checkBooking();

    return () => {
      isCancelled = true;
    };
  }, [currentUserId, otherUserId]);

  return { hasBooking, isLoading };
}
