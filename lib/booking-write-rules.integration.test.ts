/** @jest-environment node */
import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
if (!['localhost', '127.0.0.1'].includes(new URL(url).hostname)) {
  throw new Error('Write-rule fixtures require a disposable local Supabase');
}
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient<Database>(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, options);
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
type Tables = Database['public']['Tables'];
type Member = { id: string; client: SupabaseClient<Database> };
const members: Member[] = [];
const rides: string[] = [];
const conversations: string[] = [];
const rateKeys: string[] = [];
const oldTime = '2000-01-01T00:00:00.000Z';
const comment = 'This passenger was friendly and punctual';

// Fail setup loudly: rejection alone is not proof of a working security rule.
function ok<T>(result: { data: T; error: unknown }): T {
  if (result.error) throw result.error;
  return result.data;
}
async function member(): Promise<Member> {
  const email = `write-rules-${randomUUID()}@example.test`;
  const password = 'LocalIntegrationPassword123!';
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error) throw created.error;
  const client = createClient<Database>(url, key, options);
  const m = { id: created.data.user.id, client };
  members.push(m); // Track even if sign-in subsequently fails.
  const signedIn = await client.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw signedIn.error;
  return m;
}
async function ride(driver: Member, past = false) {
  // Calendar values are derived independently of the trigger, in Pacific time.
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(Date.now() + (past ? -3 : 3) * 86400000));
  const id = randomUUID();
  rides.push(id);
  return ok(
    await admin
      .from('rides')
      .insert({
        id,
        poster_id: driver.id,
        posting_type: 'driver',
        start_location: 'Truckee',
        end_location: 'Tahoe City',
        departure_date: date,
        departure_time: '12:00:00',
        status: 'active',
        available_seats: 4,
        total_seats: 4,
      })
      .select()
      .single()
  )!;
}
async function fixture(status = 'pending', past = false) {
  const trip = await ride(driver, past);
  const booking = ok(
    await admin
      .from('trip_bookings')
      .insert({
        id: randomUUID(),
        ride_id: trip.id,
        driver_id: driver.id,
        passenger_id: passenger.id,
        status,
        driver_notes: 'driver original',
        passenger_notes: 'passenger original',
        confirmed_at: status === 'confirmed' ? oldTime : null,
      })
      .select()
      .single()
  )!;
  return { trip, booking };
}
async function thread(a = driver, b = passenger) {
  const id = randomUUID();
  conversations.push(id);
  return ok(
    await admin
      .from('conversations')
      .insert({
        id,
        participant1_id: a.id,
        participant2_id: b.id,
      })
      .select()
      .single()
  )!;
}
function review(
  bookingId: string | null,
  author = passenger,
  target = driver
): Tables['reviews']['Insert'] {
  return {
    id: randomUUID(),
    booking_id: bookingId,
    reviewer_id: author.id,
    reviewee_id: target.id,
    reviewer_role: 'passenger',
    reviewed_role: 'driver',
    rating: 5,
    comment,
  };
}
async function storedBooking(id: string) {
  return ok(await admin.from('trip_bookings').select().eq('id', id).single());
}
let driver: Member;
let passenger: Member;
let outsider: Member;

describe('Booking, review and message write rules over real Auth/PostgREST', () => {
  jest.setTimeout(30000);
  beforeAll(async () => {
    [driver, passenger, outsider] = await Promise.all([member(), member(), member()]);
  });
  afterAll(async () => {
    // Explicit child cleanup also removes any exploit that succeeded on baseline.
    // Never reset shared local data; all filters contain only this run's UUIDs.
    const ids = members.map((m) => m.id);
    const errors: unknown[] = [];
    const clean = async (query: PromiseLike<{ error: unknown }>) => {
      const result = await query;
      if (result.error) errors.push(result.error);
    };
    if (ids.length) {
      await clean(admin.from('reviews').delete().in('reviewer_id', ids));
      await clean(admin.from('reviews_pending').delete().in('user_id', ids));
      await clean(admin.from('messages').delete().in('sender_id', ids));
      await clean(admin.from('email_events').delete().in('user_id', ids));
      await clean(admin.from('user_activity').delete().in('user_id', ids));
    }
    if (conversations.length)
      await clean(admin.from('conversations').delete().in('id', conversations));
    if (rides.length) {
      await clean(admin.from('trip_bookings').delete().in('ride_id', rides));
      await clean(admin.from('rides').delete().in('id', rides));
    }
    if (rateKeys.length) await clean(admin.from('rate_limits').delete().in('key', rateKeys));
    for (const m of members) await clean(admin.auth.admin.deleteUser(m.id));
    expect(errors).toEqual([]);
  });

  it.each(['wrong-driver', 'confirmed', 'completed', 'confirmed-at'])(
    'rejects booking insert forgery: %s',
    async (kind) => {
      const trip = await ride(driver);
      const id = randomUUID();
      const result = await passenger.client.from('trip_bookings').insert({
        id,
        ride_id: trip.id,
        driver_id: kind === 'wrong-driver' ? outsider.id : driver.id,
        passenger_id: passenger.id,
        status: ['confirmed', 'completed'].includes(kind) ? kind : 'pending',
        confirmed_at: kind === 'confirmed-at' ? oldTime : null,
      });
      expect(result.error).not.toBeNull();
      expect(ok(await admin.from('trip_bookings').select('id').eq('id', id))).toEqual([]);
    }
  );

  it.each(['pending', 'invited'])(
    'allows %s creation and authorized confirmation',
    async (status) => {
      const trip = await ride(driver);
      const creator = status === 'pending' ? passenger : driver;
      const approver = status === 'pending' ? driver : passenger;
      const start = Date.now();
      const booking = ok(
        await creator.client
          .from('trip_bookings')
          .insert({
            id: randomUUID(),
            ride_id: trip.id,
            driver_id: driver.id,
            passenger_id: passenger.id,
            status,
          })
          .select()
          .single()
      )!;
      expect(booking.status).toBe(status);
      expect(Date.parse(booking.created_at!)).toBeGreaterThanOrEqual(start - 5000);
      ok(
        await approver.client
          .from('trip_bookings')
          .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
          .eq('id', booking.id)
      );
      const stored = await storedBooking(booking.id);
      expect(stored?.status).toBe('confirmed');
      expect(Date.parse(stored!.confirmed_at!)).toBeGreaterThanOrEqual(start - 5000);
      // Deliberately no assumption about seats: confirmation may atomically consume one.
    }
  );

  it.each(['pending', 'invited'])(
    'rejects forging the other participant notes on %s creation',
    async (status) => {
      const trip = await ride(driver);
      const author = status === 'pending' ? passenger : driver;
      const result = await author.client.from('trip_bookings').insert({
        ride_id: trip.id,
        driver_id: driver.id,
        passenger_id: passenger.id,
        status,
        ...(status === 'pending'
          ? { driver_notes: 'forged driver note' }
          : { passenger_notes: 'forged passenger note' }),
      });
      expect(result.error).not.toBeNull();
      expect(ok(await admin.from('trip_bookings').select('id').eq('ride_id', trip.id))).toEqual([]);
    }
  );

  it('rejects a review one Pacific hour ahead even when its UTC wall clock is already past', async () => {
    const { trip, booking } = await fixture('confirmed');
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Los_Angeles',
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(new Date(Date.now() + 3600000));
    const value = (type: string) => parts.find((p) => p.type === type)!.value;
    const date = `${value('year')}-${value('month')}-${value('day')}`;
    const time = `${value('hour')}:${value('minute')}:${value('second')}`;
    expect(Date.parse(`${date}T${time}Z`)).toBeLessThan(Date.now());
    ok(
      await admin
        .from('rides')
        .update({ departure_date: date, departure_time: time })
        .eq('id', trip.id)
    );
    expect(
      (await passenger.client.from('reviews').insert(review(booking.id))).error
    ).not.toBeNull();
  });

  it('keeps reviews member-only and permits only the author to delete', async () => {
    const { booking } = await fixture('confirmed', true);
    const row = ok(
      await passenger.client.from('reviews').insert(review(booking.id)).select().single()
    )!;
    const anon = createClient<Database>(url, key, options);
    expect((await anon.from('reviews').select('id').eq('id', row.id)).error).not.toBeNull();
    expect(
      ok(await outsider.client.from('reviews').delete().eq('id', row.id).select('id'))
    ).toEqual([]);
    expect(ok(await admin.from('reviews').select('id').eq('id', row.id))).toHaveLength(1);
    expect(
      ok(await passenger.client.from('reviews').delete().eq('id', row.id).select('id'))
    ).toEqual([{ id: row.id }]);
  });

  it('denies passenger self-approval', async () => {
    const { booking } = await fixture();
    expect(
      (
        await passenger.client
          .from('trip_bookings')
          .update({ status: 'confirmed' })
          .eq('id', booking.id)
      ).error
    ).not.toBeNull();
    expect((await storedBooking(booking.id))?.status).toBe('pending');
  });

  it.each([
    'driver_id',
    'passenger_id',
    'ride_id',
    'created_at',
    'driver_notes',
    'passenger_notes',
  ])('protects booking %s', async (field) => {
    const { booking } = await fixture();
    const actor = field === 'passenger_notes' ? driver : passenger;
    const value =
      field === 'ride_id'
        ? (await ride(driver)).id
        : field.endsWith('_id')
          ? outsider.id
          : field === 'created_at'
            ? oldTime
            : 'forged note';
    expect(
      (
        await actor.client
          .from('trip_bookings')
          .update({ [field]: value })
          .eq('id', booking.id)
      ).error
    ).not.toBeNull();
    expect(await storedBooking(booking.id)).toMatchObject({
      [field]: booking[field as keyof typeof booking],
    });
  });

  it('derives confirmed_at and preserves it during confirmed edits', async () => {
    const { booking } = await fixture('confirmed');
    ok(
      await passenger.client
        .from('trip_bookings')
        .update({ confirmed_at: new Date().toISOString(), passenger_notes: 'my note' })
        .eq('id', booking.id)
    );
    expect(await storedBooking(booking.id)).toMatchObject({
      confirmed_at: booking.confirmed_at,
      passenger_notes: 'my note',
    });
  });

  it.each(['passenger', 'driver'])(
    'allows %s cancellation and passenger reopening',
    async (role) => {
      const { booking } = await fixture();
      ok(
        await (role === 'driver' ? driver : passenger).client
          .from('trip_bookings')
          .update({ status: 'cancelled' })
          .eq('id', booking.id)
      );
      expect((await storedBooking(booking.id))?.status).toBe('cancelled');
      ok(
        await passenger.client
          .from('trip_bookings')
          .update({ status: 'pending' })
          .eq('id', booking.id)
      );
      expect(await storedBooking(booking.id)).toMatchObject({
        status: 'pending',
        confirmed_at: null,
      });
    }
  );

  it.each(['confirmed', 'completed'])(
    'allows past Pacific %s participant reviews and derives roles',
    async (status) => {
      const { booking } = await fixture(status, true);
      for (const [author, target, role, otherRole] of [
        [passenger, driver, 'passenger', 'driver'],
        [driver, passenger, 'driver', 'passenger'],
      ] as const) {
        const inserted = ok(
          await author.client
            .from('reviews')
            .insert({
              ...review(booking.id, author, target),
              reviewer_role: otherRole,
              reviewed_role: role,
              status: 'hidden',
              is_pending: true,
              created_at: oldTime,
            })
            .select()
            .single()
        )!;
        expect(inserted).toMatchObject({
          reviewer_role: role,
          reviewed_role: otherRole,
          status: 'active',
          is_pending: false,
        });
        expect(Date.parse(inserted.created_at!)).toBeGreaterThan(Date.now() - 30000);
        expect(
          (await author.client.from('reviews').insert(review(booking.id, author, target))).error
        ).not.toBeNull();
        expect(
          ok(
            await admin
              .from('reviews')
              .select('id')
              .eq('booking_id', booking.id)
              .eq('reviewer_id', author.id)
          )
        ).toHaveLength(1);
      }
    }
  );

  it.each(['future', 'pending', 'unrelated', 'missing', 'null', 'wrong-reviewee'])(
    'rejects %s review evidence',
    async (kind) => {
      const { booking } = await fixture(
        kind === 'pending' ? 'pending' : 'confirmed',
        kind !== 'future'
      );
      const author = kind === 'unrelated' ? outsider : passenger;
      const id = randomUUID();
      const result = await author.client.from('reviews').insert({
        ...review(
          kind === 'missing' ? randomUUID() : kind === 'null' ? null : booking.id,
          author,
          kind === 'wrong-reviewee' ? outsider : driver
        ),
        id,
      });
      expect(result.error).not.toBeNull();
      expect(ok(await admin.from('reviews').select('id').eq('id', id))).toEqual([]);
    }
  );

  it.each([
    'status',
    'is_pending',
    'reviewer_id',
    'reviewee_id',
    'booking_id',
    'created_at',
    'reviewer_role',
    'reviewed_role',
  ])('denies review %s tampering', async (field) => {
    const { booking } = await fixture('confirmed', true);
    const original = ok(
      await passenger.client.from('reviews').insert(review(booking.id)).select().single()
    )!;
    const value =
      field === 'booking_id'
        ? (await fixture('confirmed', true)).booking.id
        : field.endsWith('_id')
          ? outsider.id
          : field === 'is_pending'
            ? true
            : field === 'created_at'
              ? oldTime
              : field === 'status'
                ? 'hidden'
                : field === 'reviewer_role'
                  ? 'driver'
                  : 'passenger';
    expect(
      (
        await passenger.client
          .from('reviews')
          .update({ [field]: value })
          .eq('id', original.id)
      ).error
    ).not.toBeNull();
    expect(ok(await admin.from('reviews').select().eq('id', original.id).single())).toMatchObject({
      [field]: original[field as keyof typeof original],
    });
  });

  it('allows rating/comment editing but rejects a short review', async () => {
    const { booking } = await fixture('confirmed', true);
    const original = ok(
      await passenger.client.from('reviews').insert(review(booking.id)).select().single()
    )!;
    ok(
      await passenger.client
        .from('reviews')
        .update({ rating: 4, comment: 'A very pleasant trip with company' })
        .eq('id', original.id)
    );
    expect(
      ok(await admin.from('reviews').select('rating').eq('id', original.id).single())?.rating
    ).toBe(4);
    expect(
      (
        await passenger.client
          .from('reviews')
          .update({ comment: 'too short' })
          .eq('id', original.id)
      ).error
    ).not.toBeNull();
  });

  it.each(['length', 'whitespace', 'self', 'unrelated'])(
    'rejects %s message writes',
    async (kind) => {
      const sender = await member(); // Fresh sender prevents baseline volume contamination.
      const conversation = await thread(kind === 'unrelated' ? driver : sender, passenger);
      const id = randomUUID();
      expect(
        (
          await sender.client.from('messages').insert({
            id,
            sender_id: sender.id,
            recipient_id: kind === 'self' ? sender.id : passenger.id,
            conversation_id: conversation.id,
            content:
              kind === 'length' ? 'x'.repeat(5001) : kind === 'whitespace' ? ' \t\n ' : 'hello',
          })
        ).error
      ).not.toBeNull();
      expect(ok(await admin.from('messages').select('id').eq('id', id))).toEqual([]);
    }
  );

  it('allows 5000 characters but replaces backdated time and forged read state', async () => {
    const sender = await member();
    const conversation = await thread(sender, passenger);
    const start = Date.now();
    const inserted = ok(
      await sender.client
        .from('messages')
        .insert({
          id: randomUUID(),
          sender_id: sender.id,
          recipient_id: passenger.id,
          conversation_id: conversation.id,
          content: 'x'.repeat(5000),
          created_at: oldTime,
          is_read: true,
        })
        .select()
        .single()
    )!;
    expect(inserted.content).toHaveLength(5000);
    expect(inserted.is_read).toBe(false);
    expect(Date.parse(inserted.created_at!)).toBeGreaterThanOrEqual(start - 5000);
  });

  it('serializes concurrent direct inserts at the 60/hour boundary without backdate bypass', async () => {
    const sender = await member();
    const conversation = await thread(sender, passenger);
    const payload = {
      sender_id: sender.id,
      recipient_id: passenger.id,
      conversation_id: conversation.id,
      content: 'boundary',
    };
    ok(
      await admin.from('messages').insert(
        Array.from({ length: 58 }, () => ({
          ...payload,
          id: randomUUID(),
          created_at: new Date().toISOString(),
        }))
      )
    );
    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        sender.client.from('messages').insert({
          ...payload,
          id: randomUUID(),
          created_at: oldTime,
        })
      )
    );
    expect(results.filter((r) => !r.error)).toHaveLength(2);
    expect(results.filter((r) => r.error)).toHaveLength(6);
    const rows = ok(await admin.from('messages').select('created_at').eq('sender_id', sender.id))!;
    expect(rows).toHaveLength(60);
    expect(rows.every((row) => Date.parse(row.created_at!) > Date.now() - 3600000)).toBe(true);
    expect(
      (await sender.client.from('messages').insert({ ...payload, created_at: oldTime })).error
    ).not.toBeNull();
    expect(ok(await admin.from('messages').select('id').eq('sender_id', sender.id))).toHaveLength(
      60
    );
  });

  it('denies conversation participant rewriting', async () => {
    const conversation = await thread();
    expect(
      (
        await driver.client
          .from('conversations')
          .update({ participant2_id: outsider.id })
          .eq('id', conversation.id)
      ).error
    ).not.toBeNull();
    expect(
      ok(
        await admin
          .from('conversations')
          .select('participant2_id')
          .eq('id', conversation.id)
          .single()
      )?.participant2_id
    ).toBe(passenger.id);
  });

  it('denies member rate-limit calls and cleanup without resetting another user', async () => {
    const rateKey = `write-rules:${randomUUID()}:${outsider.id}`;
    rateKeys.push(rateKey);
    const args = {
      p_key: rateKey,
      p_endpoint: 'integration',
      p_max_requests: 1,
      p_window_seconds: 3600,
    };
    expect(ok(await admin.rpc('check_rate_limit', args))).toMatchObject({ allowed: true });
    expect(
      (await passenger.client.rpc('check_rate_limit', { ...args, p_max_requests: 100000 })).error
    ).not.toBeNull();
    expect(
      (await passenger.client.rpc('cleanup_old_rate_limits', { p_older_than_hours: 0 })).error
    ).not.toBeNull();
    expect(ok(await admin.rpc('check_rate_limit', args))).toMatchObject({ allowed: false });
    // Delete just this key, never call global cleanup as service role.
    ok(await admin.from('rate_limits').delete().eq('key', rateKey));
  });

  it('denies forged notification and analytics evidence with valid service controls', async () => {
    const conversation = await thread();
    const email = {
      user_id: passenger.id,
      to_email: `fixture-${randomUUID()}@example.test`,
      email_type: 'booking_confirmation',
      status: 'sent',
    };
    const activity = { user_id: passenger.id, event: 'login' };
    const pending = {
      id: randomUUID(),
      user_id: passenger.id,
      conversation_id: conversation.id,
      other_participant_id: driver.id,
      role: 'passenger',
      other_role: 'driver',
      days_since_last_message: 3,
    };
    ok(await admin.from('email_events').insert(email));
    ok(await admin.from('user_activity').insert(activity));
    ok(await admin.from('reviews_pending').insert(pending));
    const forgedEmail = await passenger.client.from('email_events').insert(email);
    const forgedActivity = await passenger.client.from('user_activity').insert(activity);
    const forgedPending = await passenger.client
      .from('reviews_pending')
      .insert({ ...pending, id: randomUUID(), conversation_id: (await thread()).id });
    expect([forgedEmail.error, forgedActivity.error, forgedPending.error].every(Boolean)).toBe(
      true
    );
    expect(
      ok(await admin.from('email_events').select('id').eq('user_id', passenger.id))
    ).toHaveLength(1);
    expect(
      ok(await admin.from('user_activity').select('id').eq('user_id', passenger.id))
    ).toHaveLength(1);
    expect(
      ok(await admin.from('reviews_pending').select('id').eq('user_id', passenger.id))
    ).toHaveLength(1);
  });

  it('positive control: participant review creation works without forged metadata', async () => {
    const { booking } = await fixture('confirmed', true);
    const inserted = ok(
      await passenger.client.from('reviews').insert(review(booking.id)).select().single()
    )!;
    expect(inserted).toMatchObject({
      booking_id: booking.id,
      reviewer_id: passenger.id,
      reviewee_id: driver.id,
    });
  });

  it('positive control: a member can send to their own conversation', async () => {
    const sender = await member();
    const conversation = await thread(sender, passenger);
    const inserted = ok(
      await sender.client
        .from('messages')
        .insert({
          id: randomUUID(),
          sender_id: sender.id,
          recipient_id: passenger.id,
          conversation_id: conversation.id,
          content: 'A normal participant message',
        })
        .select()
        .single()
    )!;
    expect(inserted).toMatchObject({ sender_id: sender.id, conversation_id: conversation.id });
  });
});
