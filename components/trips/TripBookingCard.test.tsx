import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { createClient } from '@supabase/supabase-js';
import TripBookingCard from './TripBookingCard';
import MyTripsView from './MyTripsView';
import TripBookingsList from './TripBookingsList';
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
    total_seats: 5,
    available_seats: 3,
  },
} as unknown as TripBooking;

describe('TripBookingCard', () => {
  it('groups driver bookings by ride identity and keeps passenger actions inside management', () => {
    const onUpdateStatus = jest.fn();
    const onMessage = jest.fn();
    const ride = { ...booking.ride!, total_seats: 5, available_seats: 3 };
    const confirmed = { ...booking, id: 'confirmed-booking', status: 'confirmed' as const, ride };
    const invited = { ...booking, id: 'invited-booking', status: 'invited' as const, ride };
    const otherRide = { ...booking, id: 'other-booking', ride: { ...ride, id: 'separate-leg' } };
    render(
      <TripBookingsList
        bookings={[{ ...booking, ride }, otherRide, confirmed, invited]}
        role="driver"
        onUpdateStatus={onUpdateStatus}
        onMessage={onMessage}
        onCancelRequest={jest.fn()}
        bookingActionLoadingIds={[]}
      />
    );
    expect(screen.getAllByRole('heading', { name: 'Tahoe → San Francisco' })).toHaveLength(2);
    expect(screen.getAllByText('3 of 5 seats available')).toHaveLength(2);
    const summary = screen.getByText('Manage passengers (3)');
    const group = summary.closest('details')!;
    expect(group).not.toHaveAttribute('open');
    fireEvent.click(summary);
    expect(group).toHaveAttribute('open');
    expect(within(group).getByText('pending')).toBeInTheDocument();
    expect(within(group).getByText('confirmed')).toBeInTheDocument();
    expect(within(group).getByText('Invitation Sent')).toBeInTheDocument();
    fireEvent.click(within(group).getByRole('button', { name: 'Accept' }));
    expect(onUpdateStatus).toHaveBeenCalledWith('return-booking', 'confirmed');
    fireEvent.click(within(group).getAllByRole('button', { name: 'Message' })[1]);
    expect(onMessage).toHaveBeenCalledWith(confirmed.passenger, ride);
    fireEvent.click(summary);
    expect(group).not.toHaveAttribute('open');
  });

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
      fireEvent.click(await screen.findByText('Manage passengers (1)'));
      const accept = screen.getByRole('button', { name: 'Accept' });
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
      jest
        .mocked(fetchMyDriverTrips)
        .mockResolvedValue([
          { ...booking, status: 'confirmed', ride: { ...booking.ride!, available_seats: 2 } },
        ]);
      fireEvent.click(accept);
      expect(await screen.findByText('confirmed')).toBeInTheDocument();
      expect(await screen.findByText('2 of 5 seats available')).toBeInTheDocument();
      expect(screen.getByText('Manage passengers (1)').closest('details')).toHaveAttribute('open');
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
