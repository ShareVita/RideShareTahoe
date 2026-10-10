'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import RideForm from '@/components/rides/RideForm';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import type { RidePostType, Vehicle } from '@/app/community/types';
import { toast } from 'react-hot-toast';
import { tahoeDateTime } from '@/lib/dateFormat';
import Link from 'next/link';
import { readRideDraft, RIDE_DRAFT_KEY, type RideDraft } from '@/components/vehicles/rideDraft';

/**
 * Page for creating new ride posts.
 * Handles form submission for both one-way and round-trip rides.
 */
export default function CreateRidePage() {
  const router = useRouter();
  const { user, isLoading } = useProtectedRoute();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [draft, setDraft] = useState<RideDraft | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [posted, setPosted] = useState<Partial<RidePostType> | null>(null);
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    const saved = readRideDraft();

    const fetchVehicles = async () => {
      try {
        const response = await fetch('/api/community/vehicles');
        if (response.ok) {
          const data = await response.json();
          setVehicles(data.vehicles || []);
        }
      } catch (err) {
        console.error('Failed to fetch vehicles', err);
      } finally {
        setDraft(saved?.ownerId === userId ? saved : null);
        setDraftReady(true);
      }
    };

    fetchVehicles();
  }, [userId]);

  const handleSave = async (data: Partial<RidePostType>) => {
    if (!user) return;
    const { posting_type, start_location, end_location, departure_date, departure_time } = data;
    if (
      !posting_type ||
      !['driver', 'passenger', 'flexible'].includes(posting_type) ||
      !start_location?.trim() ||
      !end_location?.trim() ||
      !departure_date ||
      !departure_time ||
      !tahoeDateTime(departure_date, departure_time)
    ) {
      setError('Enter a posting type, locations, and a valid Pacific departure date and time.');
      return;
    }
    if (data.is_round_trip) {
      const departure = tahoeDateTime(departure_date, departure_time);
      const returning = tahoeDateTime(data.return_date || '', data.return_time || '');
      if (!departure || !returning || returning <= departure) {
        setError('Return trip must have a valid Pacific date and time after departure.');
        return;
      }
    }
    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();

      // Generate a client-side UUID for grouping round trips if needed
      const round_trip_group_id = data.is_round_trip ? crypto.randomUUID() : null;

      const commonData = {
        poster_id: user.id,
        posting_type,
        title: data.title,
        start_location,
        end_location,
        start_lat: data.start_lat,
        start_lng: data.start_lng,
        end_lat: data.end_lat,
        end_lng: data.end_lng,
        price_per_seat: data.price_per_seat,
        total_seats: data.total_seats,
        available_seats: data.posting_type === 'driver' ? data.total_seats : null,
        description: data.description,
        special_instructions: data.special_instructions,
        has_awd: data.has_awd,
        car_type: data.car_type,
        status: 'active',
        is_round_trip: data.is_round_trip,
        round_trip_group_id,
        is_recurring: false, // Default for now
      };

      // 1. Departure Trip
      const ridesToInsert = [
        {
          ...commonData,
          departure_date,
          departure_time,
          trip_direction: data.is_round_trip ? 'departure' : null,
        },
      ];

      // 2. Return Trip (if applicable)
      if (data.is_round_trip && data.return_date && data.return_time) {
        ridesToInsert.push({
          ...commonData,
          start_location: end_location, // Swap locations
          end_location: start_location,
          start_lat: data.end_lat,
          start_lng: data.end_lng,
          end_lat: data.start_lat,
          end_lng: data.start_lng,
          departure_date: data.return_date,
          departure_time: data.return_time,
          trip_direction: 'return',
        });
      }

      const { error: insertError } = await supabase.from('rides').insert(ridesToInsert);

      if (insertError) throw insertError;

      if (data.start_lat == null || data.end_lat == null) {
        toast(
          'Ride posted. One or more locations could not be mapped, so it will not appear in those location-filtered searches. Edit the locations to try again.',
          { duration: 10000 }
        );
      }
      setPosted(data);
      window.scrollTo({ top: 0, behavior: 'instant' });
      try {
        sessionStorage.removeItem(RIDE_DRAFT_KEY);
      } catch {
        // A storage restriction must not turn a successful insert into an error.
      }
    } catch (err) {
      console.error('Error creating ride:', err);
      setError('Failed to create ride. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || (user && !draftReady)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return null; // useProtectedRoute handles redirect
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 py-8 transition-colors duration-300">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Post a Ride</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Share your journey or find a ride with the community.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 shadow-sm rounded-lg p-6 border border-gray-200 dark:border-slate-800">
          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {posted ? (
            <div role="status" className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {posted.is_round_trip ? 'Your round trip is posted' : 'Your ride is posted'}
              </h2>
              <p className="text-gray-700 dark:text-gray-300">
                {posted.title}: {posted.start_location} → {posted.end_location}. Your post is saved.
                You can manage it in My Posts.
              </p>
              {(posted.start_lat == null || posted.end_lat == null) && (
                <p className="text-amber-800 dark:text-amber-200">
                  One or more locations could not be mapped. Your ride will not appear in those
                  location-filtered searches; edit the locations in My Posts to try again.
                </p>
              )}
              <Link
                href="/community?view=my-posts"
                className="inline-flex rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
              >
                View My Posts
              </Link>
            </div>
          ) : (
            <RideForm
              initialData={{
                posting_type: 'driver',
                start_location: '',
                end_location: '',
                departure_date: '',
                departure_time: '',
                price_per_seat: 0,
                total_seats: 1,
                description: '',
                special_instructions: '',
                has_awd: false,
                ...draft?.data,
              }}
              draftOwnerId={user.id}
              initialVehicleId={draft?.vehicleId}
              onSave={handleSave}
              onCancel={() => router.back()}
              isLoading={saving}
              isEditing={false}
              vehicles={vehicles}
            />
          )}
        </div>
      </div>
    </div>
  );
}
