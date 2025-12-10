import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { fetchMyRides } from '@/libs/community/ridesData';

import type { CommunityUser, RidePostType } from '../types';
import type { SupabaseClient } from '@supabase/supabase-js';

type CommunitySupabaseClient = SupabaseClient;

interface UseCommunityRidesReturn {
  dataLoading: boolean;
  myRides: RidePostType[];
  setMyRides: Dispatch<SetStateAction<RidePostType[]>>;
  fetchRidesData: () => Promise<void>;
}

export const useCommunityRides = (
  supabase: CommunitySupabaseClient,
  currentUser: CommunityUser | null
): UseCommunityRidesReturn => {
  const [dataLoading, setDataLoading] = useState(true);
  const [myRides, setMyRides] = useState<RidePostType[]>([]);

  const fetchRidesData = useCallback(async () => {
    setDataLoading(true);
    try {
      if (currentUser) {
        const mine = await fetchMyRides(supabase, currentUser);
        setMyRides(mine);
      } else {
        setMyRides([]);
      }
    } catch (error) {
      console.error('Error in fetchRidesData wrapper:', error);
    } finally {
      setDataLoading(false);
    }
  }, [supabase, currentUser]);

  useEffect(() => {
    if (currentUser) {
      void fetchRidesData();
    } else {
      setMyRides([]);
      setDataLoading(false);
    }
  }, [currentUser, fetchRidesData]);

  return useMemo(
    () => ({
      dataLoading,
      myRides,
      setMyRides,
      fetchRidesData,
    }),
    [dataLoading, myRides, fetchRidesData]
  );
};
