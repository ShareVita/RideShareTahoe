import { sanitizeLocation } from '@/libs/sanitize/location';

interface RouteInfoProps {
  startLocation: string;
  endLocation: string;
}

/**
 * Displays the route information (from/to locations) for a ride post.
 */
export function RouteInfo({ startLocation, endLocation }: RouteInfoProps) {
  const sanitizedStartLocation = sanitizeLocation(startLocation);
  const sanitizedEndLocation = sanitizeLocation(endLocation);

  return (
    <div className="mb-4 grow">
      <div className="flex items-center text-sm text-gray-700 dark:text-gray-300 mb-2">
        <span className="font-medium w-12 text-gray-500 dark:text-gray-400">From:</span>
        <span className="truncate flex-1">{sanitizedStartLocation}</span>
      </div>
      <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
        <span className="font-medium w-12 text-gray-500 dark:text-gray-400">To:</span>
        <span className="truncate flex-1">{sanitizedEndLocation}</span>
      </div>
    </div>
  );
}
