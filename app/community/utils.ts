import { calculateDistance } from '@/libs/distance';
import type { LocationFilterType, RidePostType } from './types';

/**
 * Filters rides by departure location (start_lat/start_lng).
 *
 * @param rides - Array of ride posts to filter
 * @param filter - Location filter with lat, lng, and radius
 * @returns Filtered array of rides within the specified radius of the departure location
 */
const filterRidesByDeparture = (
  rides: RidePostType[],
  filter: LocationFilterType | null
): RidePostType[] => {
  if (!filter || rides.length === 0) {
    return rides;
  }

  return rides.filter((ride) => {
    if (ride.start_lat == null || ride.start_lng == null) return false;
    const distance = calculateDistance(filter.lat, filter.lng, ride.start_lat, ride.start_lng);
    return distance <= filter.radius;
  });
};

/**
 * Filters rides by destination location (end_lat/end_lng).
 *
 * @param rides - Array of ride posts to filter
 * @param filter - Location filter with lat, lng, and radius
 * @returns Filtered array of rides within the specified radius of the destination location
 */
const filterRidesByDestination = (
  rides: RidePostType[],
  filter: LocationFilterType | null
): RidePostType[] => {
  if (!filter || rides.length === 0) {
    return rides;
  }

  return rides.filter((ride) => {
    if (ride.end_lat == null || ride.end_lng == null) return false;
    const distance = calculateDistance(filter.lat, filter.lng, ride.end_lat, ride.end_lng);
    return distance <= filter.radius;
  });
};

/**
 * Filters rides by both departure and destination locations.
 * Only returns rides that match both criteria.
 *
 * @param rides - Array of ride posts to filter
 * @param departureFilter - Location filter for departure (start location)
 * @param destinationFilter - Location filter for destination (end location)
 * @returns Filtered array of rides matching both departure and destination criteria
 */
export const filterRidesByBoth = (
  rides: RidePostType[],
  departureFilter: LocationFilterType | null,
  destinationFilter: LocationFilterType | null
): RidePostType[] => {
  let filtered = rides;

  if (departureFilter) {
    filtered = filterRidesByDeparture(filtered, departureFilter);
  }

  if (destinationFilter) {
    filtered = filterRidesByDestination(filtered, destinationFilter);
  }

  return filtered;
};
