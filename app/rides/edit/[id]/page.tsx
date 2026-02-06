'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/libs/supabase/client';
import RideForm from '@/components/rides/RideForm';
import { useUser } from '@/components/providers/SupabaseUserProvider';
import type { RidePostType, Vehicle } from '@/app/community/types';

// Edit modes: single (one date), future (this + future), series (all dates)
type EditMode = 'single' | 'future' | 'series';

interface EditRidePageProps {
  params: Promise<{ id: string }>;
}

interface BookingInfo {
  id: string;
  ride_id: string;
  passenger_id: string;
  passenger_email?: string;
  passenger_name?: string;
  pickup_location: string;
  pickup_time: string;
  status: string;
  original_ride_date: string;
  original_ride_time: string;
}

export default function EditRidePage({ params }: Readonly<EditRidePageProps>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useUser();
  const [rides, setRides] = useState<RidePostType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [rideId, setRideId] = useState<string | null>(null);
  const [isSeriesEdit, setIsSeriesEdit] = useState(false);
  const [editMode, setEditMode] = useState<EditMode>('single');
  const [existingBookings, setExistingBookings] = useState<BookingInfo[]>([]);
  const [bookingsWarningAcknowledged, setBookingsWarningAcknowledged] = useState(false);

  // Unwrap params in useEffect
  useEffect(() => {
    params.then((p) => setRideId(p.id));
  }, [params]);

  // Read mode from URL query parameter
  useEffect(() => {
    const modeParam = searchParams.get('mode');
    if (modeParam === 'single' || modeParam === 'future' || modeParam === 'series') {
      setEditMode(modeParam);
    }
  }, [searchParams]);

  useEffect(() => {
    const loadRides = async () => {
      // Wait for auth and rideId to be determined
      if (authLoading || !rideId) return;

      if (!user) {
        router.push('/login');
        return;
      }

      // Get the current mode from URL
      const modeParam = searchParams.get('mode') as EditMode | null;
      const currentMode = modeParam || 'single';

      try {
        const supabase = createClient();

        // Fetch the initial ride
        const { data: initialRide, error: fetchError } = await supabase
          .from('rides')
          .select('*')
          .eq('id', rideId)
          .single();

        if (fetchError || !initialRide) {
          setError('Ride not found');
          setLoading(false);
          return;
        }

        // Verify ownership
        if (initialRide.poster_id !== user.id) {
          setError('You are not authorized to edit this ride');
          setLoading(false);
          return;
        }

        // Check if this ride is part of a multi-date series
        const isSeries = initialRide.round_trip_group_id && initialRide.is_recurring;

        if (isSeries && currentMode !== 'single') {
          // Load rides based on edit mode
          let query = supabase
            .from('rides')
            .select('*')
            .eq('round_trip_group_id', initialRide.round_trip_group_id)
            .eq('is_recurring', true)
            .or('trip_direction.is.null,trip_direction.eq.departure');

          // For 'future' mode, only load this ride and future rides
          if (currentMode === 'future') {
            query = query.gte('departure_date', initialRide.departure_date);
          }
          // For 'series' mode, load all rides (no additional filter)

          const { data: seriesRides, error: seriesError } = await query.order('departure_date', {
            ascending: true,
          });

          if (seriesError) {
            console.error('Error loading series:', seriesError);
            setError('Failed to load series rides');
            setLoading(false);
            return;
          }

          setRides(seriesRides || []);
          setIsSeriesEdit(true);

          // Fetch existing bookings for the loaded rides
          await loadExistingBookings(supabase, seriesRides || []);
        } else {
          // Single ride mode or non-series ride

          // For round trips, fetch the return leg to preserve return date/time
          if (initialRide.round_trip_group_id && !initialRide.is_recurring) {
            const { data: returnLeg } = await supabase
              .from('rides')
              .select('*')
              .eq('round_trip_group_id', initialRide.round_trip_group_id)
              .eq('trip_direction', 'return')
              .single();

            if (returnLeg) {
              // Merge return leg data into the initial ride for the form
              initialRide.is_round_trip = true;
              initialRide.return_date = returnLeg.departure_date;
              initialRide.return_time = returnLeg.departure_time;
            }
          }

          setRides([initialRide]);
          setIsSeriesEdit(false);

          // Check for bookings on single ride too
          await loadExistingBookings(supabase, [initialRide]);
        }

        // Fetch vehicles
        const vehiclesResponse = await fetch('/api/community/vehicles');
        if (vehiclesResponse.ok) {
          const vehiclesData = await vehiclesResponse.json();
          setVehicles(vehiclesData.vehicles || []);
        }
      } catch (err) {
        console.error('Error loading ride:', err);
        setError('Failed to load ride details');
      } finally {
        setLoading(false);
      }
    };

    loadRides();
  }, [rideId, user, authLoading, router, searchParams]);

  /**
   * Load existing bookings for the given rides
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const loadExistingBookings = async (supabase: any, ridesToCheck: RidePostType[]) => {
    try {
      const rideIds = ridesToCheck.map((r) => r.id);

      // Fetch bookings for these rides with nested profile select
      const { data: bookings, error: bookingsError } = await supabase
        .from('trip_bookings')
        .select(
          `
          id,
          ride_id,
          passenger_id,
          pickup_location,
          pickup_time,
          status,
          profiles!trip_bookings_passenger_id_fkey (
            first_name,
            last_name
          )
        `
        )
        .in('ride_id', rideIds)
        .in('status', ['pending', 'confirmed', 'invited']); // Only active bookings

      if (bookingsError) {
        console.error('Error loading bookings:', {
          message: bookingsError?.message || 'Unknown error',
          details: bookingsError?.details || null,
          hint: bookingsError?.hint || null,
          code: bookingsError?.code || null,
        });
        // Continue loading - bookings are optional for editing
        console.warn('Continuing without existing booking data');
        return;
      }

      if (bookings && bookings.length > 0) {
        // Enrich booking data with ride information
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const enrichedBookings: BookingInfo[] = bookings.map((booking: any) => {
          const ride = ridesToCheck.find((r) => r.id === booking.ride_id);
          return {
            id: booking.id,
            ride_id: booking.ride_id,
            passenger_id: booking.passenger_id,
            passenger_email: undefined, // Email not in profiles table
            passenger_name: booking.profiles
              ? `${booking.profiles.first_name || ''} ${booking.profiles.last_name || ''}`.trim()
              : 'Unknown',
            pickup_location: booking.pickup_location,
            pickup_time: booking.pickup_time,
            status: booking.status,
            original_ride_date: ride?.departure_date || '',
            original_ride_time: ride?.departure_time || '',
          };
        });

        setExistingBookings(enrichedBookings);
        console.log(`✓ Loaded ${enrichedBookings.length} bookings with passenger details`);
      }
    } catch (err) {
      console.error('Error loading bookings:', err);
    }
  };

  /**
   * Migrate bookings from old rides to new rides based on matching dates
   */
  const migrateBookings = async (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: any,
    oldBookings: BookingInfo[],
    newRides: RidePostType[]
  ) => {
    const migrationResults = {
      migrated: 0,
      cancelled: 0,
      errors: 0,
    };

    for (const booking of oldBookings) {
      try {
        // Find matching new ride by date
        const matchingRide = newRides.find(
          (ride) => ride.departure_date === booking.original_ride_date
        );

        if (matchingRide) {
          // Migrate booking to new ride ID
          const { error: updateError } = await supabase
            .from('trip_bookings')
            .update({
              ride_id: matchingRide.id,
              // Optionally update pickup time if ride time changed significantly
              pickup_time: booking.pickup_time,
            })
            .eq('id', booking.id);

          if (updateError) {
            console.error(`Error migrating booking ${booking.id}:`, updateError);
            migrationResults.errors++;
          } else {
            migrationResults.migrated++;
            console.log(`✓ Migrated booking ${booking.id} to ride ${matchingRide.id}`);
          }
        } else {
          // Date was removed from series - cancel the booking
          const { error: cancelError } = await supabase
            .from('trip_bookings')
            .update({
              status: 'cancelled',
              driver_notes: 'Ride date was removed from series by driver',
            })
            .eq('id', booking.id);

          if (cancelError) {
            console.error(`Error cancelling booking ${booking.id}:`, cancelError);
            migrationResults.errors++;
          } else {
            migrationResults.cancelled++;

            // TODO: Send email notification to passenger
            console.log(`✓ Cancelled booking ${booking.id} - date removed from series`);
            await sendCancellationNotification(booking);
          }
        }
      } catch (err) {
        console.error(`Error processing booking ${booking.id}:`, err);
        migrationResults.errors++;
      }
    }

    return migrationResults;
  };

  /**
   * Send notification to passenger about booking cancellation
   * TODO: Implement actual email/notification system
   */
  const sendCancellationNotification = async (booking: BookingInfo) => {
    // This should integrate with notification system
    console.log(`[NOTIFICATION] Sending cancellation notice to passenger ${booking.passenger_id}`);
    console.log(
      `Booking for ${booking.original_ride_date} at ${booking.original_ride_time} has been cancelled`
    );

    // Example: Call your notification API
    try {
      await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'booking_cancelled',
          recipientId: booking.passenger_id,
          recipientEmail: booking.passenger_email, // May be undefined
          data: {
            bookingId: booking.id,
            rideDate: booking.original_ride_date,
            rideTime: booking.original_ride_time,
            reason: 'Ride date was removed from series by driver',
          },
        }),
      });
    } catch (err) {
      console.error('Failed to send notification:', err);
    }
  };

  const handleSave = async (data: Partial<RidePostType> | Partial<RidePostType>[]) => {
    if (rides.length === 0) return;

    // Check if there are bookings and user hasn't acknowledged the warning
    if (existingBookings.length > 0 && !bookingsWarningAcknowledged) {
      setError('Please acknowledge the booking warning before saving changes.');
      return;
    }

    setSaving(true);

    try {
      const dataArray = Array.isArray(data) ? data : [data];

      if (isSeriesEdit) {
        // === SERIES EDITING WITH BOOKING MIGRATION ===

        const supabase = createClient();
        const groupId = rides[0].round_trip_group_id;

        if (!groupId) {
          throw new Error('Invalid series: missing group ID');
        }

        console.log('Starting series edit with booking migration...');
        console.log(`Found ${existingBookings.length} existing bookings`);

        // Step 1: Delete all existing rides in the series
        console.log('Step 1: Deleting old rides...');
        const deleteResponse = await fetch(`/api/rides/${rides[0].id}?apply_to=series`, {
          method: 'DELETE',
        });

        if (!deleteResponse.ok) {
          throw new Error('Failed to delete existing series rides');
        }

        // Step 2: Create new rides
        console.log('Step 2: Creating new rides...');
        const createResponse = await fetch('/api/rides', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dataArray),
        });

        if (!createResponse.ok) {
          const errorData = await createResponse.json();
          throw new Error(errorData.error || 'Failed to create new rides');
        }

        const createResult = await createResponse.json();
        const newRides: RidePostType[] = createResult.rides || [];

        console.log(`Created ${newRides.length} new rides`);

        // Step 3: Migrate bookings if any exist
        if (existingBookings.length > 0) {
          console.log('Step 3: Migrating bookings...');
          const migrationResults = await migrateBookings(supabase, existingBookings, newRides);

          console.log('Migration complete:', migrationResults);

          // Show user-friendly summary
          const summaryParts = [];
          if (migrationResults.migrated > 0) {
            summaryParts.push(`${migrationResults.migrated} booking(s) updated`);
          }
          if (migrationResults.cancelled > 0) {
            summaryParts.push(`${migrationResults.cancelled} booking(s) cancelled (dates removed)`);
          }
          if (migrationResults.errors > 0) {
            summaryParts.push(`${migrationResults.errors} error(s) occurred`);
          }

          if (summaryParts.length > 0) {
            alert(`Series updated successfully!\n\n${summaryParts.join('\n')}`);
          }
        } else {
          console.log('No bookings to migrate');
        }

        router.push('/community?view=my-posts');
        router.refresh();
      } else {
        // === SINGLE RIDE EDIT (existing logic) ===
        const singleData = dataArray[0];
        const response = await fetch(`/api/rides/${rides[0].id}?apply_to=single`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(singleData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update ride');
        }

        // If there are bookings on a single ride, warn about potential impacts
        if (existingBookings.length > 0) {
          alert(
            `Ride updated successfully!\n\n${existingBookings.length} booking(s) may need passenger notification if times changed significantly.`
          );
        }

        router.push('/community?view=my-posts');
        router.refresh();
      }
    } catch (err) {
      console.error('Error updating ride:', err);
      setError(err instanceof Error ? err.message : 'Failed to update ride');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (authLoading || loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 dark:bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded relative">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
          <button
            onClick={() => router.push('/community')}
            className="mt-2 text-sm font-medium underline"
          >
            Return to Community
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors duration-300">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {isSeriesEdit
              ? editMode === 'future'
                ? 'Edit Future Rides'
                : 'Edit Ride Series'
              : 'Edit Ride'}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {isSeriesEdit
              ? editMode === 'future'
                ? `Editing ${rides.length} ride(s) from this date forward. Add/remove dates or update details.`
                : `Editing all ${rides.length} rides in this series. Add/remove dates or update details.`
              : 'Update your ride details below.'}
          </p>
        </div>

        {/* BOOKING WARNING */}
        {existingBookings.length > 0 && (
          <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-700 rounded-xl p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-yellow-600 dark:text-yellow-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                  ⚠️ Active Bookings Detected
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                  This {isSeriesEdit ? 'series has' : 'ride has'}{' '}
                  <strong>{existingBookings.length} active booking(s)</strong>.
                  {isSeriesEdit && ' When you save changes:'}
                </p>

                {isSeriesEdit && (
                  <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-2 mb-4 ml-4 list-disc">
                    <li>
                      Bookings for dates that remain will be <strong>automatically migrated</strong>{' '}
                      to the new rides
                    </li>
                    <li>
                      Bookings for dates you remove will be <strong>cancelled</strong> and
                      passengers will be notified
                    </li>
                    <li>Time changes may affect passenger pickup times</li>
                  </ul>
                )}

                {/* Show list of affected bookings */}
                <details className="mb-4">
                  <summary className="text-sm font-medium text-yellow-800 dark:text-yellow-200 cursor-pointer hover:underline">
                    View affected bookings ({existingBookings.length})
                  </summary>
                  <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                    {existingBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="text-xs bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded"
                      >
                        <strong>{booking.passenger_name}</strong> - {booking.original_ride_date} at{' '}
                        {booking.original_ride_time}
                        <br />
                        <span className="text-yellow-600 dark:text-yellow-400">
                          Status: {booking.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </details>

                {/* Acknowledgement checkbox */}
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bookingsWarningAcknowledged}
                    onChange={(e) => setBookingsWarningAcknowledged(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-yellow-400 text-yellow-600 focus:ring-yellow-500"
                  />
                  <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    I understand that modifying this {isSeriesEdit ? 'series' : 'ride'} will affect{' '}
                    {existingBookings.length} passenger booking(s), and passengers will be notified
                    of any cancellations.
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 shadow-sm rounded-xl border border-gray-200 dark:border-slate-800 p-6">
          {rides.length > 0 && (
            <RideForm
              initialData={rides}
              onSave={handleSave}
              onCancel={handleCancel}
              isLoading={saving}
              isEditing={true}
              isSeriesEdit={isSeriesEdit}
              vehicles={vehicles}
            />
          )}
        </div>
      </div>
    </div>
  );
}
