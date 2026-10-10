import type { RidePostType } from '@/app/community/types';

// Tab-local: ride text is never placed in a URL or shared across browser tabs.
export const RIDE_DRAFT_KEY = 'ride-post-draft';

export interface RideDraft {
  ownerId: string;
  data: Partial<RidePostType>;
  vehicleId: string;
}

export function readRideDraft(): RideDraft | null {
  try {
    const draft = JSON.parse(sessionStorage.getItem(RIDE_DRAFT_KEY) || 'null');
    return draft &&
      typeof draft.ownerId === 'string' &&
      draft.data &&
      typeof draft.data === 'object' &&
      typeof draft.vehicleId === 'string'
      ? draft
      : null;
  } catch {
    return null;
  }
}
