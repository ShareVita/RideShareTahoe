import { render, screen } from '@testing-library/react';
import PublicRideList from './PublicRideList';
import type { PublicRide } from '@/libs/rides/publicRides';

it.each([
  ['Subaru Outback - AWD', 'Subaru Outback - AWD'],
  ['Jeep Wrangler - 4WD', 'Jeep Wrangler - 4WD'],
  ['Old SUV', 'Old SUV · AWD/4WD'],
  ['Honda Civic - FWD', 'Honda Civic - FWD'],
  ['Pickup - RWD', 'Pickup - RWD'],
])('renders drivetrain accurately for %s', (carType, expected) => {
  const ride: PublicRide = {
    id: 'ride',
    postingType: 'driver',
    from: 'Truckee',
    to: 'Tahoe City',
    departureDate: '2026-12-20',
    departureTime: '08:00',
    isRoundTrip: false,
    returnDate: null,
    seatsAvailable: 2,
    pricePerSeat: 10,
    carType,
    hasAwd: true,
    posterLabel: 'Alex',
  };
  render(<PublicRideList rides={[ride]} />);
  expect(screen.getByText(expected, { selector: 'dd' })).toBeInTheDocument();
});
