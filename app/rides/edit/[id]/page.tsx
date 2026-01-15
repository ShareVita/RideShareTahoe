'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import RideForm from '@/components/rides/RideForm';
import { fetchRideById, updateRide } from '@/libs/community/ridesData';
import { useUser } from '@/components/providers/SupabaseUserProvider';
import type { RidePostType } from '@/app/community/types';

export default function EditRidePage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const router = useRouter();
  const { user, loading: authLoading } = useUser();
  const [ride, setRide] = useState<RidePostType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unwrappedParams = use(params);

  useEffect(() => {
    const loadRide = async () => {
      // Wait for auth to be determined
      if (authLoading) return;

      if (!user) {
        router.push('/login');
        return;
      }

      try {
        const supabase = createClient();
        const data = await fetchRideById(supabase, unwrappedParams.id);

        if (!data) {
          setError('Ride not found');
          setLoading(false);
          return;
        }

        // Verify ownership
        if (data.poster_id !== user.id) {
          setError('You are not authorized to edit this ride');
          setLoading(false);
          return;
        }

        setRide(data);
      } catch (err) {
        console.error('Error loading ride:', err);
        setError('Failed to load ride details');
      } finally {
        setLoading(false);
      }
    };

    loadRide();
  }, [unwrappedParams.id, user, authLoading, router]);

  const handleSave = async (data: Partial<RidePostType>) => {
    if (!ride) return;
    setSaving(true);
    try {
      const supabase = createClient();
      await updateRide(supabase, ride.id, data);
      router.push(`/community/`); // Redirect to community/my rides eventually
      router.refresh();
    } catch (err) {
      console.error('Error updating ride:', err);
      // Could show toast here
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
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Ride</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Update your ride details below.</p>
        </div>

        <div className="bg-white dark:bg-slate-900 shadow-sm rounded-xl border border-gray-200 dark:border-slate-800 p-6">
          {ride && (
            <RideForm
              initialData={ride}
              onSave={handleSave}
              onCancel={handleCancel}
              isLoading={saving}
              isEditing={true}
            />
          )}
        </div>
      </div>
    </div>
  );
}
