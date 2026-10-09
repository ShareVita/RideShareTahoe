/** @jest-environment node */
import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Capacity integration requires ${name}`);
  return value;
}
const url = env('NEXT_PUBLIC_SUPABASE_URL');
if (!['localhost', '127.0.0.1'].includes(new URL(url).hostname)) {
  throw new Error('Capacity fixtures require a disposable local Supabase');
}
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient<Database>(url, env('SUPABASE_SERVICE_ROLE_KEY'), options);
const key = env('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
type Member = { id: string; client: SupabaseClient<Database> };
const members: Member[] = [];
const rides: string[] = [];
let driver: Member;
let first: Member;
let second: Member;

function ok<T>(result: { data: T; error: unknown }): T {
  if (result.error) throw result.error;
  return result.data;
}
async function member(): Promise<Member> {
  const email = `capacity-${randomUUID()}@example.test`;
  const password = 'LocalCapacityPassword123!';
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error) throw created.error;
  const m = { id: created.data.user.id, client: createClient<Database>(url, key, options) };
  members.push(m);
  const signedIn = await m.client.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw signedIn.error;
  return m;
}
async function ride(total: number | null, available = total) {
  const id = randomUUID();
  rides.push(id);
  return ok(
    await driver.client
      .from('rides')
      .insert({
        id,
        poster_id: driver.id,
        posting_type: 'driver',
        start_location: 'Truckee',
        end_location: 'Kings Beach',
        departure_date: new Intl.DateTimeFormat('en-CA', {
          timeZone: 'America/Los_Angeles',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date(Date.now() + 3 * 86400000)),
        departure_time: '13:17:00',
        status: 'active',
        total_seats: total,
        available_seats: available,
      })
      .select()
      .single()
  )!;
}
function insertBooking(
  rideId: string,
  passenger: Member,
  status: 'pending' | 'invited',
  id = randomUUID()
) {
  return (status === 'pending' ? passenger : driver).client
    .from('trip_bookings')
    .insert({ id, ride_id: rideId, driver_id: driver.id, passenger_id: passenger.id, status })
    .select()
    .single();
}
function updateBooking(actor: Member, id: string, status: string) {
  return actor.client.from('trip_bookings').update({ status }).eq('id', id).select().single();
}
async function state(
  rideId: string,
  total: number | null,
  available: number | null,
  statuses: Record<string, string>
) {
  expect(
    ok(await admin.from('rides').select('total_seats, available_seats').eq('id', rideId).single())
  ).toEqual({ total_seats: total, available_seats: available });
  const rows = ok(await admin.from('trip_bookings').select('id, status').eq('ride_id', rideId))!;
  expect(Object.fromEntries(rows.map((row) => [row.id, row.status]))).toEqual(statuses);
}

describe('Atomic booking capacity over real GoTrue/PostgREST', () => {
  jest.setTimeout(30000);
  beforeAll(async () => {
    [driver, first, second] = await Promise.all([member(), member(), member()]);
  });
  afterAll(async () => {
    // Only this run's UUIDs, including fixtures whose writes unexpectedly succeeded.
    const errors: unknown[] = [];
    const clean = async (query: PromiseLike<{ error: unknown }>) => {
      const result = await query;
      if (result.error) errors.push(result.error);
    };
    if (rides.length) {
      await clean(admin.from('trip_bookings').delete().in('ride_id', rides));
      await clean(admin.from('rides').delete().in('id', rides));
    }
    const ids = members.map((m) => m.id);
    if (ids.length) {
      await clean(admin.from('reviews_pending').delete().in('user_id', ids));
      await clean(admin.from('email_events').delete().in('user_id', ids));
      await clean(admin.from('user_activity').delete().in('user_id', ids));
    }
    for (const m of members) await clean(admin.auth.admin.deleteUser(m.id));
    expect(errors).toEqual([]);
  });

  it('serializes two driver approvals for the last seat and rolls back the loser', async () => {
    const trip = await ride(1);
    const a = ok(await insertBooking(trip.id, first, 'pending'))!;
    const b = ok(await insertBooking(trip.id, second, 'pending'))!;
    await state(trip.id, 1, 1, { [a.id]: 'pending', [b.id]: 'pending' });
    const results = await Promise.all([
      updateBooking(driver, a.id, 'confirmed'),
      updateBooking(driver, b.id, 'confirmed'),
    ]);
    expect(results.filter((r) => !r.error)).toHaveLength(1);
    expect(results.filter((r) => r.error)).toHaveLength(1);
    expect(results.find((r) => r.error)?.error?.message).toBe('No seats available');
    const winner = results.findIndex((r) => !r.error);
    await state(trip.id, 1, 0, {
      [a.id]: winner === 0 ? 'confirmed' : 'pending',
      [b.id]: winner === 1 ? 'confirmed' : 'pending',
    });
  });

  it('arbitrates invitation creation against pending approval without partial writes', async () => {
    const trip = await ride(1);
    const pending = ok(await insertBooking(trip.id, first, 'pending'))!;
    const invitedId = randomUUID();
    const [invitation, approval] = await Promise.all([
      insertBooking(trip.id, second, 'invited', invitedId),
      updateBooking(driver, pending.id, 'confirmed'),
    ]);
    expect([invitation, approval].filter((r) => !r.error)).toHaveLength(1);
    expect([invitation, approval].filter((r) => r.error)).toHaveLength(1);
    await state(
      trip.id,
      1,
      0,
      invitation.error
        ? { [pending.id]: 'confirmed' }
        : { [pending.id]: 'pending', [invitedId]: 'invited' }
    );
  });

  it('double approval reserves once, even when concurrent and repeated', async () => {
    const trip = await ride(3);
    const booking = ok(await insertBooking(trip.id, first, 'pending'))!;
    const results = await Promise.all([
      updateBooking(driver, booking.id, 'confirmed'),
      updateBooking(driver, booking.id, 'confirmed'),
    ]);
    results.forEach(ok);
    ok(await updateBooking(driver, booking.id, 'confirmed'));
    await state(trip.id, 3, 2, { [booking.id]: 'confirmed' });
  });

  it('serializes competing invitation inserts without a foreign-key lock-upgrade deadlock', async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      const trip = await ride(1);
      const ids = [randomUUID(), randomUUID()];
      const results = await Promise.all([
        insertBooking(trip.id, first, 'invited', ids[0]),
        insertBooking(trip.id, second, 'invited', ids[1]),
      ]);
      expect(results.filter((r) => !r.error)).toHaveLength(1);
      expect(results.find((r) => r.error)?.error?.message).toBe('No seats available');
      const winner = results.findIndex((r) => !r.error);
      await state(trip.id, 1, 0, { [ids[winner]]: 'invited' });
    }
  });

  it('serializes a capacity reduction against an approval without overbooking', async () => {
    const trip = await ride(2);
    const a = ok(await insertBooking(trip.id, first, 'invited'))!;
    const b = ok(await insertBooking(trip.id, second, 'pending'))!;
    const [reduction, approval] = await Promise.all([
      driver.client.from('rides').update({ total_seats: 1 }).eq('id', trip.id),
      updateBooking(driver, b.id, 'confirmed'),
    ]);
    expect([reduction, approval].filter((r) => !r.error)).toHaveLength(1);
    expect([reduction, approval].filter((r) => r.error)).toHaveLength(1);
    await state(trip.id, reduction.error ? 2 : 1, 0, {
      [a.id]: 'invited',
      [b.id]: approval.error ? 'pending' : 'confirmed',
    });
  });

  it('acceptance retains the invitation reservation; cancellation restores exactly once', async () => {
    const trip = await ride(3);
    const a = ok(await insertBooking(trip.id, first, 'invited'))!;
    const b = ok(await insertBooking(trip.id, second, 'invited'))!;
    await state(trip.id, 3, 1, { [a.id]: 'invited', [b.id]: 'invited' });
    ok(await updateBooking(first, a.id, 'confirmed'));
    await state(trip.id, 3, 1, { [a.id]: 'confirmed', [b.id]: 'invited' });
    ok(await updateBooking(driver, b.id, 'cancelled'));
    ok(await updateBooking(second, b.id, 'cancelled'));
    await state(trip.id, 3, 2, { [a.id]: 'confirmed', [b.id]: 'cancelled' });
    ok(await updateBooking(second, b.id, 'pending'));
    ok(await updateBooking(second, b.id, 'cancelled'));
    await state(trip.id, 3, 2, { [a.id]: 'confirmed', [b.id]: 'cancelled' });
  });

  it('rejects sequential overbooking without inserting or confirming a failed reservation', async () => {
    const trip = await ride(1);
    const pending = ok(await insertBooking(trip.id, second, 'pending'))!;
    const reserved = ok(await insertBooking(trip.id, first, 'invited'))!;
    const other = await member(); // Distinct passenger: rejection must not be a duplicate constraint.
    expect((await updateBooking(driver, pending.id, 'confirmed')).error).not.toBeNull();
    expect((await insertBooking(trip.id, other, 'invited')).error).not.toBeNull();
    await state(trip.id, 1, 0, { [reserved.id]: 'invited', [pending.id]: 'pending' });
  });

  it('derives capacity on ride edits, rejects reductions below reservations and ignores inflation', async () => {
    const trip = await ride(5);
    const a = ok(await insertBooking(trip.id, first, 'invited'))!;
    const b = ok(await insertBooking(trip.id, second, 'pending'))!;
    ok(await updateBooking(driver, b.id, 'confirmed'));
    const statuses = { [a.id]: 'invited', [b.id]: 'confirmed' };
    const edit = (values: { total_seats?: number; available_seats?: number }) =>
      driver.client.from('rides').update(values).eq('id', trip.id).select().single();
    expect((await edit({ total_seats: 1, available_seats: 91 })).error).not.toBeNull();
    await state(trip.id, 5, 3, statuses);
    ok(await edit({ total_seats: 3, available_seats: 83 }));
    await state(trip.id, 3, 1, statuses);
    ok(await edit({ available_seats: 79 }));
    await state(trip.id, 3, 1, statuses);
    ok(await edit({ total_seats: 2 }));
    await state(trip.id, 2, 0, statuses);
    ok(await edit({ total_seats: 6 }));
    await state(trip.id, 6, 4, statuses);
  });

  it('derives initial availability rather than trusting inflated client input', async () => {
    const trip = await ride(2, 47);
    await state(trip.id, 2, 2, {});
  });

  it('counts completed bookings as reservations during public ride edits', async () => {
    const trip = await ride(4);
    // Completion is a trusted lifecycle operation, not a member-authorized transition.
    const id = randomUUID();
    ok(
      await admin.from('trip_bookings').insert({
        id,
        ride_id: trip.id,
        driver_id: driver.id,
        passenger_id: first.id,
        status: 'completed',
      })
    );
    await state(trip.id, 4, 3, { [id]: 'completed' });
    expect(
      (await driver.client.from('rides').update({ total_seats: 0 }).eq('id', trip.id)).error
    ).not.toBeNull();
    await state(trip.id, 4, 3, { [id]: 'completed' });
    ok(
      await driver.client
        .from('rides')
        .update({ total_seats: 2, available_seats: 61 })
        .eq('id', trip.id)
    );
    await state(trip.id, 2, 1, { [id]: 'completed' });
  });

  it('leaves null total capacity untracked through invitation, approval and cancellation', async () => {
    const trip = await ride(null);
    const a = ok(await insertBooking(trip.id, first, 'invited'))!;
    const b = ok(await insertBooking(trip.id, second, 'pending'))!;
    ok(await updateBooking(first, a.id, 'confirmed'));
    ok(await updateBooking(driver, b.id, 'confirmed'));
    await state(trip.id, null, null, { [a.id]: 'confirmed', [b.id]: 'confirmed' });
    // A separate invitation exercises release without relying on confirmed cancellation rules.
    const other = await member();
    const c = ok(await insertBooking(trip.id, other, 'invited'))!;
    ok(await updateBooking(other, c.id, 'cancelled'));
    await state(trip.id, null, null, {
      [a.id]: 'confirmed',
      [b.id]: 'confirmed',
      [c.id]: 'cancelled',
    });
  });
});
