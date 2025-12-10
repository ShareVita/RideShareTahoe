// #region Types

/**
 * Defines the allowable values for the `cn` utility function.
 * This includes strings, or falsy values that should be filtered out.
 */
type ClassValue = string | undefined | null | false;

/**
 * Represents the structure for location data fields.
 * All fields are optional and can be null.
 */
interface LocationFields {
  city?: string | null;
  state?: string | null;
}

// #endregion

// #region Constants

/**
 * A Set of common US state abbreviations to keep uppercase.
 * Using a Set provides faster (O(1)) lookups compared to an array's .includes().
 */
const stateAbbreviations: Set<string> = new Set([
  'ca',
  'ny',
  'tx',
  'fl',
  'il',
  'pa',
  'oh',
  'ga',
  'nc',
  'mi',
  'nj',
  'va',
  'wa',
  'az',
  'ma',
  'tn',
  'in',
  'mo',
  'md',
  'co',
  'or',
  'wi',
  'mn',
  'sc',
  'al',
  'la',
  'ky',
  'ar',
  'ut',
  'ia',
  'nv',
  'ct',
  'ms',
  'ks',
  'ne',
  'id',
  'hi',
  'nh',
  'me',
  'ri',
  'mt',
  'de',
  'sd',
  'nd',
  'ak',
  'vt',
  'wy',
  'wv',
]);

// #endregion

// #region Functions

/**
 * Utility function to merge class names, filtering out falsy values.
 * @param {...ClassValue} classes - A list of class names to merge.
 * @returns {string} - A single string of merged class names.
 */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Properly capitalizes location text, handling abbreviations and exceptions.
 * @param {string | null | undefined} text - The text to capitalize.
 * @returns {string | null | undefined} - Properly capitalized text, or the original falsy value.
 */
export function capitalizeLocation(text: string | null | undefined): string | null | undefined {
  if (!text) {
    return text;
  }

  const lowerText = text.toLowerCase().trim();

  // If it's a state abbreviation, return it uppercase
  if (stateAbbreviations.has(lowerText)) {
    return lowerText.toUpperCase();
  }

  // Split by spaces and capitalize each word
  const words: string[] = lowerText.split(' ');
  const specialWords = new Set(['of', 'the', 'and', 'in', 'at']);

  const capitalizeSegment = (segment: string) =>
    segment ? segment.charAt(0).toUpperCase() + segment.slice(1) : segment;

  const capitalizedWords: string[] = words.map((word: string, index: number) => {
    if (!word) return word;

    const segments = word.split('-');
    const capitalizedSegments = segments.map((segment: string, segmentIndex: number) => {
      if (segmentIndex === 0) {
        return capitalizeSegment(segment);
      }

      return segment;
    });
    const normalizedWord = capitalizedSegments.join('-');

    // Handle special articles/prepositions, but allow the first word to be capitalized
    if (specialWords.has(word) && index > 0) {
      return word;
    }

    return normalizedWord;
  });

  return capitalizedWords.join(' ');
}

/**
 * Formats a location object with proper capitalization.
 * @param {LocationFields | null | undefined} location - Object containing location fields.
 * @returns {LocationFields | null | undefined} - Object with capitalized fields, or the original falsy value.
 */
export function formatLocation(
  location: LocationFields | null | undefined
): LocationFields | null | undefined {
  if (!location) {
    return location;
  }

  // capitalizeLocation is built to handle null/undefined values.
  return {
    city: capitalizeLocation(location.city),
    state: capitalizeLocation(location.state),
  };
}

/**
 * Normalizes pronoun strings (e.g., "he/him") for display.
 *
 * @param value - The raw pronoun value stored in the database.
 * @returns The capitalized pronoun string, or the original falsy value.
 */
export function formatPronouns(value: string | null | undefined): string | null | undefined {
  if (!value) {
    return value;
  }

  const segments = value
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1));

  return segments.length > 0 ? segments.join('/') : value;
}

// #endregion

// #region Location Privacy

/**
 * Applies a random offset to coordinates for privacy.
 * The offset is between 800m and 1200m in a random direction.
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {{ lat: number; lng: number }} - Offset coordinates
 */

// #endregion
