import { render, screen, fireEvent, act } from '@testing-library/react';
import { createClient } from '@supabase/supabase-js';
import TripBookingCard from './TripBookingCard';
import MyTripsView from './MyTripsView';
import {
  fetchMyDriverTrips,
  fetchMyPassengerTrips,
  updateTripBooking,
} from '@/libs/community/tripsData';
import type { TripBooking } from '@/app/community/types';
import type { Database } from '@/types/database.types';

jest.mock('@/libs/community/tripsData', () => ({
  fetchMyDriverTrips: jest.fn(),
  fetchMyPassengerTrips: jest.fn(),
  updateTripBooking: jest.fn(),
}));

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
  it('keeps a rejected My Trips approval pending, shows the conflict, and permits retry', async () => {
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      jest.mocked(fetchMyDriverTrips).mockResolvedValue([booking]);
      jest.mocked(fetchMyPassengerTrips).mockResolvedValue([]);
      const pending = Promise.withResolvers<void>();
      jest.mocked(updateTripBooking).mockReturnValueOnce(pending.promise);
      render(
        <MyTripsView
          user={{ id: 'driver' }}
          supabase={createClient<Database>('http://localhost:54321', 'test', {
            auth: { persistSession: false },
          })}
          onMessage={jest.fn()}
        />
      );
      const accept = await screen.findByRole('button', { name: 'Accept' });
      fireEvent.click(accept);
      expect(accept).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Decline' })).toBeDisabled();
      await act(async () => {
        pending.reject({ message: 'No seats available' });
      });
      expect(screen.getByRole('alert')).toHaveTextContent('No seats available');
      expect(screen.getByText('pending')).toBeInTheDocument();
      expect(screen.queryByText('confirmed')).not.toBeInTheDocument();
      expect(accept).toBeEnabled();
      jest.mocked(updateTripBooking).mockResolvedValueOnce(undefined);
      fireEvent.click(accept);
      expect(await screen.findByText('confirmed')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    } finally {
      log.mockRestore();
    }
  });

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
