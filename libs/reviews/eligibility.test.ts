import { isReviewableBooking } from './eligibility';

describe('shared review eligibility', () => {
  const ride = { departure_date: '2026-07-04', departure_time: '23:30:00' };
  it.each(['confirmed', 'completed'])('allows past %s without changing status', (status) => {
    const booking = { status, ride };
    expect(isReviewableBooking(booking, new Date('2026-07-05T06:30:01Z'))).toBe(true);
    expect(booking.status).toBe(status);
  });
  it.each(['confirmed', 'completed'])('excludes future and exact departure %s', (status) => {
    expect(isReviewableBooking({ status, ride }, new Date('2026-07-05T01:00:00Z'))).toBe(false);
    expect(isReviewableBooking({ status, ride }, new Date('2026-07-05T06:30:00Z'))).toBe(false);
  });
  it.each(['pending', 'invited', 'cancelled'])('excludes past %s', (status) => {
    expect(isReviewableBooking({ status, ride }, new Date('2026-07-06T00:00:00Z'))).toBe(false);
  });
  it('fails closed on missing ride or a DST gap', () => {
    expect(isReviewableBooking({ status: 'confirmed', ride: null })).toBe(false);
    expect(
      isReviewableBooking({
        status: 'confirmed',
        ride: {
          departure_date: '2026-03-08',
          departure_time: '02:30',
        },
      })
    ).toBe(false);
  });
});
