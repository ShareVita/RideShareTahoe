'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/libs/supabase/client';
import RideForm from '@/components/rides/RideForm';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import type { RidePostType, Vehicle } from '@/app/community/types';

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

  useEffect(() => {
    if (!user) return;

    const fetchVehicles = async () => {
      try {
        const response = await fetch('/api/community/vehicles');
        if (response.ok) {
          const data = await response.json();
          setVehicles(data.vehicles || []);
        }
      } catch (err) {
        console.error('Failed to fetch vehicles', err);
        // Don't simplify error state; vehicle selection is optional
      }
    };

    fetchVehicles();
  }, [user]);

  const handleSave = async (data: Partial<RidePostType>) => {
    if (!user) return;
    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();

      // Generate a client-side UUID for grouping round trips if needed
      const round_trip_group_id = data.is_round_trip ? crypto.randomUUID() : null;

      // Lookup vehicle details for dual-write compatibility
      const selectedVehicle = vehicles.find((v) => v.id === data.vehicle_id);
      const car_type = selectedVehicle
        ? `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model} (${selectedVehicle.color})`
        : null;
      const has_awd = selectedVehicle
        ? selectedVehicle.drivetrain === 'AWD' || selectedVehicle.drivetrain === '4WD'
        : false;

      const commonData = {
        poster_id: user.id,
        posting_type: data.posting_type,
        status: 'active',
        title: data.title,
        start_location: data.start_location,
        end_location: data.end_location,
        price_per_seat: data.price_per_seat,
        // New columns
        available_seats: data.posting_type === 'driver' ? (data.available_seats ?? 1) : null,
        vehicle_id: data.vehicle_id,
        // Legacy columns (Dual-write)
        total_seats: data.posting_type === 'driver' ? (data.available_seats ?? 1) : null,
        car_type,
        has_awd,

        description: data.description,
        special_instructions: data.special_instructions,
        is_round_trip: data.is_round_trip,
        round_trip_group_id,
        is_recurring: false, // Default for now
        // Privacy: Mapping exact addresses
        start_address_street: data.start_location,
        end_address_street: data.end_location,
      };

      const ridesToInsert = [];

      // 1. Departure Trip
      ridesToInsert.push({
        ...commonData,
        departure_date: data.departure_date,
        departure_time: data.departure_time,
        trip_direction: data.is_round_trip ? 'departure' : null,
        // Ensure return metadata is present on the departure leg
        return_date: data.return_date || null,
        return_time: data.return_time || null,
      });

      // 2. Return Trip (if applicable)
      if (data.is_round_trip && data.return_date && data.return_time) {
        ridesToInsert.push({
          ...commonData,
          start_location: data.end_location, // Swap locations
          end_location: data.start_location,
          // Swap addresses for return leg
          start_address_street: data.end_location,
          end_address_street: data.start_location,
          departure_date: data.return_date,
          departure_time: data.return_time,
          trip_direction: 'return',
          // Return info for the return leg refers to the original departure
          return_date: data.departure_date || null,
          return_time: data.departure_time || null,
        });
      }

      const { error: insertError } = await supabase.from('rides').insert(ridesToInsert);

      if (insertError) throw insertError;

      router.push('/community');
    } catch (err) {
      console.error('Error creating ride:', err);
      setError('Failed to create ride. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
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

          <RideForm
            initialData={{
              posting_type: 'driver',
              start_location: '',
              end_location: '',
              departure_date: '',
              departure_time: '',
              price_per_seat: 0,
              available_seats: 1,
              description: '',
              special_instructions: '',
              vehicle_id: '',
            }}
            onSave={handleSave}
            onCancel={() => router.back()}
            isLoading={saving}
            isEditing={false}
            vehicles={vehicles}
          />
        </div>
      </div>
    </div>
  );
}
