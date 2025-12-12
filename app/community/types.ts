/**
 * Shared types for the community experience.
 */

/**
 * Captures browser network status details.
 */
export interface NetworkInfo {
  userAgent: string;
  connectionType: string;
  downlink: number | string;
  rtt: number | string;
  saveData: boolean;
  online: boolean;
  timestamp: string;
}

/**
 * Location filter state produced by the `LocationFilter` component.
 */
export interface LocationFilterType {
  lat: number;
  lng: number;
  radius: number;
}

/**
 * Minimal Supabase user identity required by the community hooks.
 */
export interface CommunityUser {
  id: string;
}

/**
 * Dog metadata returned from the `dogs` table.
 */

/**
 * Profile metadata returned with availability posts.
 */
export interface ProfileType {
  id: string;
  first_name: string | null;
  last_name: string | null;
  profile_photo_url: string | null;
  city: string | null;
  state: string | null;
  bio: string | null;

  pronouns?: string | null;
  community_support_badge: string | null;
  support_preferences: string[] | null;
  support_story: string | null;
  other_support_description: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  airbnb_url: string | null;
  other_social_url: string | null;
  car_details: { type?: string; color?: string; year?: number } | null;
}

/**
 * Local state for the message modal.
 */
export interface MessageModalState {
  isOpen: boolean;
  recipient: ProfileType | null;
  ridePost?: RidePostType | null;
}

/**
 * Navigator connection metadata from the Network Information API.
 */
export type EffectiveConnectionType = 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';

export interface NetworkInformation extends EventTarget {
  readonly effectiveType?: EffectiveConnectionType;
  readonly downlink?: number;
  readonly rtt?: number;
  readonly saveData?: boolean;
}

export interface NavigatorWithConnection extends Navigator {
  readonly connection?: NetworkInformation;
  readonly mozConnection?: NetworkInformation;
  readonly webkitConnection?: NetworkInformation;
}

/**
 * Ride post shape used across community pages.
 */
export interface RidePostType {
  id: string;
  poster_id: string;
  posting_type: 'driver' | 'passenger' | 'flexible';
  start_location: string;
  end_location: string;
  start_lat: number | null;
  start_lng: number | null;
  end_lat: number | null;
  end_lng: number | null;
  departure_date: string;
  departure_time: string;
  is_round_trip: boolean;
  trip_direction: 'departure' | 'return' | null;
  round_trip_group_id: string | null;
  is_recurring: boolean;
  recurring_days: string[] | null;
  pricing_type: 'per_seat' | 'split_costs' | null;
  price_per_seat: number | null;
  gas_estimate: number | null;
  total_seats: number | null;
  available_seats: number | null;
  car_type: string | null;
  has_awd: boolean;
  driving_arrangement: string | null;
  music_preference: string | null;
  conversation_preference: string | null;
  title: string | null;
  description: string | null;
  special_instructions: string | null;
  status: 'active' | 'inactive' | 'completed' | 'cancelled';
  created_at: string;
  owner: ProfileType | null;
  return_date: string | null;
  return_time: string | null;
}

export type TripBookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'invited';

export interface TripBooking {
  id: string;
  ride_id: string;
  driver_id: string;
  passenger_id: string;
  pickup_location: string | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  pickup_time: string | null; // ISO string
  status: TripBookingStatus;
  driver_notes: string | null;
  passenger_notes: string | null;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;

  // Relations
  driver?: ProfileType;
  passenger?: ProfileType;
  ride?: RidePostType;
}

export interface Vehicle {
  id: string;
  owner_id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  license_plate?: string;
  drivetrain?: 'FWD' | 'RWD' | 'AWD' | '4WD';
  created_at?: string;
  updated_at?: string;
}
