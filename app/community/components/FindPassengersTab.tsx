'use client';

import React from 'react';
import { PassengersSection } from './passengers/PassengersSection';
import PassengersList from './passengers/PassengersList';
import type { RidePostType, ProfileType } from '../types';
import type { CommunitySupabaseClient } from '@/libs/community/ridesData';

interface PassengersTabProps {
  user: { id: string } | null;
  supabase: CommunitySupabaseClient;
  // eslint-disable-next-line no-unused-vars
  openMessageModal: (recipient: ProfileType, ridePost: RidePostType) => void;
  initialPage?: number;
  pageSize?: number;
}

/**
 * FindPassengersTab component orchestrates the display of passenger ride requests
 * and passenger profiles in the community.
 */
export default function FindPassengersTab({
  user,
  supabase,
  openMessageModal,
  initialPage,
  pageSize,
}: Readonly<PassengersTabProps>) {
  return (
    <div className="space-y-12">
      {/* Section 1: Passenger Ride Requests */}
      <section>
        <PassengersSection
          user={user}
          supabase={supabase}
          openMessageModal={openMessageModal}
          initialPage={initialPage}
          pageSize={pageSize}
        />
      </section>

      {/* Section 2: Passenger Profiles */}
      <section>
        <div className="flex items-center mb-6">
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-slate-50 flex items-center">
            <span className="mr-2">👋</span>
            <span>Passengers in the Community</span>
          </h3>
        </div>
        <PassengersList supabase={supabase} />
      </section>
    </div>
  );
}
