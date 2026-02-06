/**
 * Ride grouping utilities for organizing and categorizing rides
 *
 * This module provides functions to group rides by their relationships:
 * - Multi-date series (recurring rides with same group ID)
 * - Departure vs return leg filtering
 */

import type { RidePostType } from '@/app/community/types';
import { parseDate } from '@/libs/dateTimeFormatters';

/**
 * Filter rides to only include departure legs (not return legs).
 *
 * A ride is considered a departure leg if:
 * - trip_direction is null/undefined (standalone ride)
 * - trip_direction is 'departure'
 *
 * @param rides - Array of rides to filter
 * @returns Array of departure leg rides only
 *
 * @example
 * const allRides = [...]; // Mix of departure and return legs
 * const departureOnly = filterDepartureLegs(allRides);
 */
export function filterDepartureLegs<T extends Pick<RidePostType, 'trip_direction'>>(
  rides: T[]
): T[] {
  return rides.filter((r) => !r.trip_direction || r.trip_direction === 'departure');
}

/**
 * Filter rides to only include departure legs, with proper typing for Partial rides.
 * Use this when working with Partial<RidePostType> arrays.
 *
 * @param rides - Array of partial rides to filter
 * @returns Array of departure leg rides only
 */
export function filterDepartureLegsPartial<T extends Partial<Pick<RidePostType, 'trip_direction'>>>(
  rides: T[]
): T[] {
  return rides.filter((r) => !r.trip_direction || r.trip_direction === 'departure');
}

/**
 * Represents a multi-date series of rides
 */
export interface SeriesGroup {
  /** Unique identifier for this series */
  groupId: string;
  /** All rides in this series */
  rides: RidePostType[];
  /** Title of the rides */
  title: string;
  /** Starting location */
  start_location: string;
  /** Ending location */
  end_location: string;
}

/**
 * Extract series groups from a list of rides
 *
 * This function filters rides to only those that are part of a multi-date series
 * (is_recurring = true) and groups them by their round_trip_group_id.
 *
 * @param rides - Array of rides to filter and group
 * @returns Array of series groups, sorted by first departure date
 *
 * @example
 * // Get all series for displaying in an invitation modal
 * const driverRides = [...]; // Driver's rides
 * const seriesGroups = extractSeriesGroups(driverRides);
 *
 * seriesGroups.forEach(series => {
 *   console.log(`${series.title}: ${series.rides.length} trips`);
 *   console.log(`From ${series.start_location} to ${series.end_location}`);
 * });
 */
export function extractSeriesGroups(rides: RidePostType[]): SeriesGroup[] {
  const seriesMap: Record<string, RidePostType[]> = {};

  // Group by round_trip_group_id where is_recurring = true
  for (const ride of rides) {
    if (ride.round_trip_group_id && ride.is_recurring) {
      if (!seriesMap[ride.round_trip_group_id]) {
        seriesMap[ride.round_trip_group_id] = [];
      }
      seriesMap[ride.round_trip_group_id].push(ride);
    }
  }

  // Convert to SeriesGroup array
  const seriesGroups = Object.entries(seriesMap).map(([groupId, groupRides]) => {
    const sortedRides = groupRides.sort(
      (a, b) => parseDate(a.departure_date).getTime() - parseDate(b.departure_date).getTime()
    );

    return {
      groupId,
      rides: sortedRides,
      title: sortedRides[0].title || 'Untitled Series',
      start_location: sortedRides[0].start_location,
      end_location: sortedRides[0].end_location,
    };
  });

  // Sort by first ride date
  return seriesGroups.sort(
    (a, b) =>
      parseDate(a.rides[0].departure_date).getTime() -
      parseDate(b.rides[0].departure_date).getTime()
  );
}
