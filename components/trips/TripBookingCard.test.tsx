import { render, screen, fireEvent } from '@testing-library/react';
import TripBookingCard from './TripBookingCard';
import type { TripBooking } from '@/app/community/types';

const booking = {
  id: 'return-booking',
  status: 'pending',
  pickup_time: '2026-01-06T00:30:00Z',
  pickup_location: 'Tahoe meeting point',
  passenger: { id: 'passenger', first_name: 'Passenger' },
  driver: { id: 'driver', first_name: 'Driver' },
  ride: {
    id: 'return-leg',
    status: 'active',
    departure_date: '2026-01-05',
    departure_time: '16:30:00',
    start_location: 'Tahoe',
    end_location: 'San Francisco',
  },
} as unknown as TripBooking;

describe('TripBookingCard', () => {
  it('retains the deleted counterpart name and history without actionable contact or booking controls', () => {
    const onUpdateStatus = jest.fn();
    const onMessage = jest.fn();
    render(
      <TripBookingCard
        booking={{
          ...booking,
          passenger: {
            ...booking.passenger!,
            first_name: 'Deleted member',
            last_name: null,
            deleted_at: '2026-10-08',
          },
        }}
        role="driver"
        onUpdateStatus={onUpdateStatus}
        onMessage={onMessage}
      />
    );
    expect(screen.getByText('Deleted member')).toBeInTheDocument();
    expect(screen.getByText(/Trip history is retained/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Message' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Message' }));
    expect(onMessage).not.toHaveBeenCalled();
    expect(onUpdateStatus).not.toHaveBeenCalled();
  });

  it('displays the scheduled calendar date and Pacific pickup, not UTC or host time', () => {
    render(
      <TripBookingCard
        booking={booking}
        role="passenger"
        onUpdateStatus={jest.fn()}
        onMessage={jest.fn()}
      />
    );
    expect(screen.getByText('Jan 5, 2026')).toBeInTheDocument();
    expect(screen.getByText('4:30 PM')).toBeInTheDocument();
    expect(screen.getByText('4:30 PM PST')).toBeInTheDocument();
    expect(screen.getByText('Pacific time')).toBeInTheDocument();
  });

  it('targets return booking and ride identities for actions', () => {
    const onUpdateStatus = jest.fn();
    const onMessage = jest.fn();
    render(
      <TripBookingCard
        booking={booking}
        role="driver"
        onUpdateStatus={onUpdateStatus}
        onMessage={onMessage}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    expect(onUpdateStatus).toHaveBeenCalledWith('return-booking', 'confirmed');
    fireEvent.click(screen.getByRole('button', { name: 'Message' }));
    expect(onMessage).toHaveBeenCalledWith(booking.passenger, booking.ride);
  });
});
