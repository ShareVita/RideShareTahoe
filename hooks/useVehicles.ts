/**
 * Custom hook for fetching and managing user vehicles
 *
 * This hook provides a consistent way to fetch vehicles across the application,
 * with built-in loading states and error handling.
 */

import { useState, useEffect } from 'react';
import type { Vehicle } from '@/app/community/types';

/**
 * Return type for the useVehicles hook
 */
interface UseVehiclesReturn {
  /** Array of user's vehicles */
  vehicles: Vehicle[];
  /** Loading state */
  loading: boolean;
  /** Error state (null if no error) */
  error: Error | null;
  /** Function to manually refresh vehicles */
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and manage user vehicles
 *
 * Automatically fetches vehicles when the userId changes.
 * Provides loading and error states for better UX.
 *
 * @param userId - ID of the user whose vehicles to fetch (null if not logged in)
 * @returns Object containing vehicles array, loading state, error state, and refetch function
 *
 * @example
 * Basic usage:
 * ```tsx
 * function MyComponent() {
 *   const { user } = useUser();
 *   const { vehicles, loading, error } = useVehicles(user?.id || null);
 *
 *   if (loading) return <div>Loading vehicles...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <select>
 *       {vehicles.map(v => (
 *         <option key={v.id}>{v.year} {v.make} {v.model}</option>
 *       ))}
 *     </select>
 *   );
 * }
 * ```
 *
 * @example
 * With manual refresh:
 * ```tsx
 * function MyComponent() {
 *   const { user } = useUser();
 *   const { vehicles, loading, refetch } = useVehicles(user?.id || null);
 *
 *   const handleAddVehicle = async () => {
 *     // ... add vehicle logic
 *     await refetch(); // Refresh the list
 *   };
 *
 *   return <div>...</div>;
 * }
 * ```
 */
export function useVehicles(userId: string | null): UseVehiclesReturn {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch vehicles from the API
   */
  const fetchVehicles = async () => {
    // Don't fetch if no user
    if (!userId) {
      setVehicles([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/community/vehicles');

      if (!response.ok) {
        // Handle HTTP errors
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch vehicles (${response.status})`);
      }

      const data = await response.json();
      setVehicles(data.vehicles || []);
    } catch (err) {
      console.error('Error fetching vehicles:', err);
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      setVehicles([]); // Clear vehicles on error
    } finally {
      setLoading(false);
    }
  };

  // Fetch vehicles when userId changes
  useEffect(() => {
    fetchVehicles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return {
    vehicles,
    loading,
    error,
    refetch: fetchVehicles,
  };
}

/**
 * Hook variant that only fetches vehicles once (doesn't refetch on userId change)
 * Useful when you know the userId won't change during component lifetime
 *
 * @param userId - ID of the user whose vehicles to fetch
 * @returns Object containing vehicles array, loading state, and error state
 *
 * @example
 * ```tsx
 * function StaticComponent() {
 *   const { user } = useUser();
 *   const { vehicles, loading } = useVehiclesOnce(user?.id || null);
 *
 *   // Vehicles are only fetched once, even if user?.id changes
 *   return <div>...</div>;
 * }
 * ```
 */
export function useVehiclesOnce(userId: string | null): Omit<UseVehiclesReturn, 'refetch'> {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    // Only fetch once
    if (hasFetched || !userId) return;

    const fetchVehicles = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/community/vehicles');

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to fetch vehicles (${response.status})`);
        }

        const data = await response.json();
        setVehicles(data.vehicles || []);
        setHasFetched(true);
      } catch (err) {
        console.error('Error fetching vehicles:', err);
        setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, [userId, hasFetched]);

  return { vehicles, loading, error };
}
