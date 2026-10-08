/** @jest-environment node */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { processDeletionRequest } from './accountDeletion';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
if (!['localhost', '127.0.0.1'].includes(new URL(url).hostname))
  throw new Error('Local fixtures only');
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, options);
const users: string[] = [];
const members: SupabaseClient[] = [];
let rideId: string;
let pastRideId: string;
let survivingRideId: string;
const must = (result: { error: unknown }) => {
  if (result.error) throw result.error;
};

beforeAll(async () => {
  for (let i = 0; i < 3; i++) {
    const email = `retention-${Date.now()}-${i}@example.test`;
    const password = 'DisposableFixturePassword123!';
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    must(created);
    users.push(created.data.user!.id);
    const member = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, options);
    must(await member.auth.signInWithPassword({ email, password }));
    members.push(member);
  }
});
afterAll(async () => {
  if (rideId) await admin.from('rides').delete().eq('id', rideId);
  if (pastRideId) await admin.from('rides').delete().eq('id', pastRideId);
  if (survivingRideId) await admin.from('rides').delete().eq('id', survivingRideId);
  for (const id of users) {
    await admin.auth.admin.deleteUser(id);
    await admin.from('profiles').delete().eq('id', id);
  }
});

it('real GoTrue hard deletion preserves asymmetric history and rejects stale JWTs', async () => {
  const [deleted, a, b] = users;
  expect(
    (await members[1].from('profiles').update({ deleted_at: new Date().toISOString() }).eq('id', a))
      .error?.code
  ).toBe('42501');
  expect(
    (await admin.from('profiles').insert({ id: crypto.randomUUID(), first_name: 'Forged' })).error
      ?.code
  ).toBe('42501');
  must(
    await admin
      .from('profiles')
      .update({ first_name: 'Private name', bio: 'Private bio' })
      .eq('id', deleted)
  );
  must(
    await admin
      .from('profile_socials')
      .insert({ user_id: deleted, facebook_url: 'https://example.test/private' })
  );
  must(
    await admin.from('vehicles').insert({
      owner_id: deleted,
      make: 'Private',
      model: 'Private',
      year: 2020,
      color: 'Private',
      license_plate: 'PRIVATE',
    })
  );
  must(
    await admin
      .from('user_private_info')
      .update({ street_address: 'Private home', phone_number: '555-0100' })
      .eq('id', deleted)
  );
  const ride = await admin
    .from('rides')
    .insert({
      poster_id: deleted,
      posting_type: 'driver',
      start_location: 'Private home',
      end_location: 'Private work',
      start_lat: 39.123456,
      departure_date: '2099-01-01',
      departure_time: '12:00',
      description: 'Private ride text',
    })
    .select('id')
    .single();
  must(ride);
  rideId = ride.data!.id;
  const survivingRide = await admin
    .from('rides')
    .insert({
      poster_id: a,
      posting_type: 'driver',
      start_location: 'Keep surviving origin',
      end_location: 'Keep surviving destination',
      departure_date: '2099-01-01',
      departure_time: '12:00',
      available_seats: 0,
      total_seats: 2,
    })
    .select('id')
    .single();
  must(survivingRide);
  survivingRideId = survivingRide.data!.id;
  must(
    await admin.from('trip_bookings').insert({
      ride_id: survivingRideId,
      driver_id: a,
      passenger_id: deleted,
      status: 'confirmed',
      driver_notes: 'Keep surviving driver notes',
      passenger_notes: 'Remove deleted passenger notes',
    })
  );
  const past = await admin
    .from('rides')
    .insert({
      poster_id: deleted,
      posting_type: 'driver',
      start_location: 'Private past home',
      end_location: 'Private past work',
      departure_date: '2020-01-01',
      departure_time: '12:00',
    })
    .select('id')
    .single();
  must(past);
  pastRideId = past.data!.id;
  const pastBooking = await admin
    .from('trip_bookings')
    .insert({ ride_id: pastRideId, driver_id: deleted, passenger_id: a, status: 'confirmed' })
    .select('id')
    .single();
  must(pastBooking);
  const unreviewedBooking = await admin
    .from('trip_bookings')
    .insert({ ride_id: pastRideId, driver_id: deleted, passenger_id: b, status: 'confirmed' })
    .select('id')
    .single();
  must(unreviewedBooking);
  for (const [reviewer, reviewee, comment] of [
    [deleted, a, 'Private review text written by poster'],
    [a, deleted, 'Keep this review by surviving member'],
  ]) {
    must(
      await admin.from('reviews').insert({
        booking_id: pastBooking.data!.id,
        reviewer_id: reviewer,
        reviewee_id: reviewee,
        rating: 5,
        comment,
        reviewer_role: reviewer === deleted ? 'driver' : 'passenger',
        reviewed_role: reviewer === deleted ? 'passenger' : 'driver',
      })
    );
  }
  for (const passenger of [a, b])
    must(
      await admin.from('trip_bookings').insert({
        ride_id: rideId,
        driver_id: deleted,
        passenger_id: passenger,
        status: passenger === a ? 'pending' : 'invited',
        driver_notes: 'Private driver text',
        passenger_notes: `Keep ${passenger}`,
        pickup_lat: 39.123456,
      })
    );
  for (const [sender, recipient, text] of [
    [deleted, a, 'Private authored message'],
    [a, deleted, 'Keep received message'],
    [a, b, 'Keep unrelated conversation'],
  ]) {
    const thread = await admin
      .from('conversations')
      .insert({ participant1_id: sender, participant2_id: recipient, ride_id: rideId })
      .select('id')
      .single();
    must(thread);
    must(
      await admin.from('messages').insert({
        sender_id: sender,
        recipient_id: recipient,
        content: text,
        ride_id: rideId,
        conversation_id: thread.data!.id,
      })
    );
  }
  must(await admin.auth.admin.deleteUser(deleted));
  expect(
    (
      await members[1]
        .from('rides')
        .select('available_seats,start_location,status')
        .eq('id', survivingRideId)
    ).data
  ).toEqual([{ available_seats: 1, start_location: 'Keep surviving origin', status: 'active' }]);
  expect(
    (
      await members[1]
        .from('trip_bookings')
        .select('status,driver_notes,passenger_notes')
        .eq('ride_id', survivingRideId)
    ).data
  ).toEqual([
    { status: 'cancelled', driver_notes: 'Keep surviving driver notes', passenger_notes: null },
  ]);
  expect(
    (await members[1].from('trip_bookings').select('status').eq('id', pastBooking.data!.id)).data
  ).toEqual([{ status: 'confirmed' }]);
  expect(
    (await members[1].from('reviews').select('comment').eq('booking_id', pastBooking.data!.id)).data
      ?.map((row) => row.comment)
      .sort()
  ).toEqual(
    ['[Review text removed by deleted member]', 'Keep this review by surviving member'].sort()
  );
  expect((await admin.auth.admin.getUserById(deleted)).error).not.toBeNull();
  expect(
    (
      await members[2].from('reviews').insert({
        booking_id: unreviewedBooking.data!.id,
        reviewer_id: b,
        reviewee_id: deleted,
        reviewer_role: 'passenger',
        reviewed_role: 'driver',
        rating: 5,
        comment: 'A new review for a deleted counterpart',
      })
    ).error?.code
  ).toBe('42501');
  expect(
    (await admin.from('profile_socials').select('user_id').eq('user_id', deleted)).data
  ).toEqual([]);
  expect((await admin.from('vehicles').select('id').eq('owner_id', deleted)).data).toEqual([]);
  expect((await admin.from('user_private_info').select('id').eq('id', deleted)).data).toEqual([]);
  const profile = await admin.from('profiles').select('*').eq('id', deleted).single();
  expect(profile.data).toMatchObject({
    first_name: 'Deleted member',
    bio: null,
    is_admin: false,
    is_banned: true,
    deleted_at: expect.any(String),
  });
  expect(
    (await admin.from('profiles').update({ deleted_at: null }).eq('id', deleted)).error?.code
  ).toBe('42501');
  const bookings = await members[1]
    .from('trip_bookings')
    .select('status,driver_notes,passenger_notes,pickup_lat')
    .eq('ride_id', rideId);
  must(bookings);
  expect(bookings.data).toEqual([
    { status: 'cancelled', driver_notes: null, passenger_notes: `Keep ${a}`, pickup_lat: null },
  ]);
  const messages = await members[1].from('messages').select('content').eq('ride_id', rideId);
  must(messages);
  expect(messages.data?.map((row) => row.content).sort()).toEqual(
    ['Keep received message', 'Keep unrelated conversation', '[Message removed]'].sort()
  );
  expect(
    (await members[1].from('rides').select('start_location,status').eq('id', rideId)).data
  ).toEqual([{ start_location: '[Location removed]', status: 'inactive' }]);
  expect((await members[1].from('rides').select('status').eq('id', pastRideId)).data).toEqual([
    { status: 'inactive' },
  ]);
  expect((await members[0].from('profiles').select('id')).data).toEqual([]);
  expect(
    (
      await members[0]
        .from('profiles')
        .update({ first_name: 'Resurrected' })
        .eq('id', deleted)
        .select()
    ).data
  ).toEqual([]);
  expect(
    (
      await members[1]
        .from('messages')
        .insert({ sender_id: a, recipient_id: deleted, content: 'Forbidden' })
    ).error
  ).not.toBeNull();
  expect(
    (
      await members[1]
        .from('messages')
        .insert({ sender_id: a, recipient_id: b, content: 'Legitimate unrelated message' })
    ).error
  ).toBeNull();
  expect((await members[1].from('profiles').delete().eq('id', a)).error?.code).toBe('42501');
});

it('keeps cleanup failure retryable, fences duplicate workers, and removes real nested Storage bytes', async () => {
  const id = users[2];
  const bucket = admin.storage.from('profile-photos');
  const paths = Array.from(
    { length: 102 },
    (_, i) => `${id}/${i === 101 ? 'nested/' : ''}photo-${i}.png`
  );
  for (const path of paths)
    must(
      await bucket.upload(path, Buffer.from('Disposable photo fixture'), {
        contentType: 'image/png',
      })
    );
  const request = await admin
    .from('account_deletion_requests')
    .insert({ user_id: id, scheduled_deletion_date: new Date(Date.now() - 1000).toISOString() })
    .select('*')
    .single();
  must(request);
  const failing = new Proxy(admin, {
    get(target, key) {
      if (key === 'storage')
        return {
          from: () => ({
            list: async () => ({ data: null, error: new Error('Injected cleanup failure') }),
          }),
        };
      return Reflect.get(target, key);
    },
  });
  const processed: string[] = [];
  const errors: { userId: string; error: string }[] = [];
  await processDeletionRequest(failing, request.data!, processed, errors);
  expect(processed).toEqual([]);
  expect(errors[0].error).toBe('Injected cleanup failure');
  expect((await admin.auth.admin.getUserById(id)).error).not.toBeNull();
  expect((await bucket.download(paths[0])).error).toBeNull();
  expect(
    (
      await members[2].storage
        .from('profile-photos')
        .upload(`${id}/stale.png`, Buffer.from('Forbidden'))
    ).error
  ).not.toBeNull();
  const stale = await admin
    .from('account_deletion_requests')
    .update({ processed_at: new Date(Date.now() - 16 * 60 * 1000).toISOString() })
    .eq('id', request.data!.id)
    .select('*')
    .single();
  must(stale);
  await Promise.all([
    processDeletionRequest(admin, stale.data!, processed, errors),
    processDeletionRequest(admin, stale.data!, processed, errors),
  ]);
  expect(processed).toEqual([id]);
  expect(
    (await admin.from('account_deletion_requests').select('status').eq('id', request.data!.id)).data
  ).toEqual([{ status: 'completed' }]);
  expect((await bucket.list(id)).data).toEqual([]);
  expect((await bucket.download(paths[0])).error).not.toBeNull();
  expect((await bucket.download(paths[101])).error).not.toBeNull();
});
