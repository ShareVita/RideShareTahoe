import { calculateDistance } from '@/libs/distance';

// Standard set of coordinates for testing
const COORDINATES = {
  NYC: { lat: 40.7128, lng: -74.006 }, // New York City, NY, USA
  LA: { lat: 34.0522, lng: -118.2437 }, // Los Angeles, CA, USA
  LONDON: { lat: 51.5074, lng: 0.1278 }, // London, UK
};

// 'calculateDistance' function using R=3959 miles and the coordinates above.
const NYC_TO_LA_ACTUAL = 2445.71;
const NYC_TO_LONDON_ACTUAL = 3471.82;
const NORTH_SOUTH_ACTUAL = 4145.86;

// Define a consistent precision for floating-point tests
const PRECISION = 2;

describe('libs/distance.js', () => {
  describe('calculateDistance', () => {
    test('should return 0 when the start and end points are the same', () => {
      const distance = calculateDistance(
        COORDINATES.NYC.lat,
        COORDINATES.NYC.lng,
        COORDINATES.NYC.lat,
        COORDINATES.NYC.lng
      );
      // Use high precision for zero to confirm exact equality for zero input
      expect(distance).toBeCloseTo(0, 5);
    });

    test('should correctly calculate the distance between NYC and LA', () => {
      const distance = calculateDistance(
        COORDINATES.NYC.lat,
        COORDINATES.NYC.lng,
        COORDINATES.LA.lat,
        COORDINATES.LA.lng
      );
      // Test against the empirically calculated value using R=3959
      expect(distance).toBeCloseTo(NYC_TO_LA_ACTUAL, PRECISION);
    });

    test('should correctly calculate the distance between NYC and London', () => {
      const distance = calculateDistance(
        COORDINATES.NYC.lat,
        COORDINATES.NYC.lng,
        COORDINATES.LONDON.lat,
        COORDINATES.LONDON.lng
      );
      // Test against the empirically calculated value using R=3959
      expect(distance).toBeCloseTo(NYC_TO_LONDON_ACTUAL, PRECISION);
    });

    test('should handle positive and negative coordinates (e.g., Northern vs Southern hemisphere)', () => {
      const p1 = { lat: 30, lng: 0 };
      const p2 = { lat: -30, lng: 0 };
      const distance = calculateDistance(p1.lat, p1.lng, p2.lat, p2.lng);
      // Test against the empirically calculated value using R=3959
      expect(distance).toBeCloseTo(NORTH_SOUTH_ACTUAL, PRECISION);
    });
  });
});
