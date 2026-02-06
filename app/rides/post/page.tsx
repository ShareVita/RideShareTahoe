'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import RideForm from '@/components/rides/RideForm';
import SeriesCreatedModal from '@/components/rides/SeriesCreatedModal';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { useVehicles } from '@/hooks/useVehicles';
import type { RidePostType } from '@/app/community/types';

/**
 * Page for creating new ride posts.
 * Supports single rides, round trips, and multi-date series.
 */
export default function CreateRidePage() {
  const router = useRouter();
  const { user, isLoading } = useProtectedRoute();
  const { vehicles } = useVehicles(user?.id || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdRides, setCreatedRides] = useState<Partial<RidePostType>[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  /**
   * Handles saving single or multiple rides.
   * Now accepts both single ride object and array of rides for multi-date posts.
   */
  const handleSave = async (data: Partial<RidePostType> | Partial<RidePostType>[]) => {
    if (!user) return;
    setSaving(true);
    setError(null);

    try {
      // Use the new API route for bulk creation
      const response = await fetch('/api/rides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create ride(s)');
      }

      const responseData = await response.json();

      // Normalize response to array for the modal
      const ridesArray = Array.isArray(responseData) ? responseData : [responseData];
      setCreatedRides(ridesArray);

      // Show success modal
      setShowSuccessModal(true);
    } catch (err) {
      console.error('Error creating ride:', err);
      setError(err instanceof Error ? err.message : 'Failed to create ride(s). Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleViewRides = () => {
    setShowSuccessModal(false);
    router.push('/community?view=my-posts');
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
            Share your journey or find a ride with the community. Select multiple dates for
            recurring trips!
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
              total_seats: 1,
              description: '',
              special_instructions: '',
              has_awd: false,
            }}
            onSave={handleSave}
            onCancel={() => router.back()}
            isLoading={saving}
            isEditing={false}
            vehicles={vehicles}
          />
        </div>
      </div>

      {/* Success Modal */}
      <SeriesCreatedModal
        isOpen={showSuccessModal}
        onClose={handleViewRides}
        rides={createdRides}
        onViewRides={handleViewRides}
      />
    </div>
  );
}
