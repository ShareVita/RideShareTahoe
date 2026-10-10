/**
 * Geocode a zip code or city name to get coordinates using Nominatim API
 */

interface Coordinates {
  lat: number;
  lng: number;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country_code?: string;
  };
}

/**
 * Geocode a zip code or city name to get coordinates using Nominatim API
 * @param query - Zip code or city name (e.g., "78701" or "Austin, TX")
 * @returns Promise resolving to coordinates or null on error
 */
async function lookupLocation(
  query: string
): Promise<(Coordinates & Omit<NominatimResult, 'lat'>) | null> {
  if (!query?.trim()) {
    return null;
  }

  try {
    // Improved geocoding: better format for zip codes and cities
    let searchQuery = query.trim();

    // Check if it's a zip code (5 digits)
    const isZipCode = /^\d{5}$/.test(searchQuery);

    // For zip codes or city names without a state, add country code for better accuracy
    if (isZipCode || !searchQuery.includes(',')) {
      searchQuery = `${searchQuery}, USA`;
    }

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        searchQuery
      )}&limit=1&addressdetails=1&countrycodes=us`,
      { signal: AbortSignal.timeout(8000) }
    );

    if (!response.ok) {
      throw new Error('Geocoding request failed');
    }

    const data: NominatimResult[] = await response.json();

    if (data && data.length > 0) {
      const result = data[0];
      const coords: Coordinates = {
        lat: Number.parseFloat(result.lat),
        lng: Number.parseFloat(result.lon),
      };

      if (
        !Number.isFinite(coords.lat) ||
        !Number.isFinite(coords.lng) ||
        Math.abs(coords.lat) > 90 ||
        Math.abs(coords.lng) > 180
      )
        return null;
      return { ...result, ...coords };
    }

    return null;
  } catch (error) {
    console.error('Error geocoding location:', error);
    return null;
  }
}

export async function geocodeLocation(query: string): Promise<Coordinates | null> {
  const result = await lookupLocation(query);
  return result ? { lat: result.lat, lng: result.lng } : null;
}

/** Resolve a US ZIP to an approximate location, not a verified home address. */
export async function geocodeZipCode(zip: string) {
  if (!/^\d{5}$/.test(zip)) return null;
  const result = await lookupLocation(zip);
  const address = result?.address;
  const city =
    address?.city || address?.town || address?.village || address?.municipality || address?.county;
  if (
    !result ||
    !city ||
    !address?.state ||
    address.country_code !== 'us' ||
    address.postcode?.split('-')[0] !== zip
  )
    return null;
  return { lat: result.lat, lng: result.lng, city, state: address.state };
}
