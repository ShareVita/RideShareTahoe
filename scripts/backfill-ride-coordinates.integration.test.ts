/** @jest-environment node */
import { spawnSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { applySQL, plannedEntry, type Ride } from './backfill-ride-coordinates';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
if (!['localhost', '127.0.0.1'].includes(new URL(url).hostname))
  throw new Error('Local fixtures only');
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const rideIds: string[] = [];
let userId: string;
const columns = 'id,start_location,end_location,updated_at,start_lat,start_lng,end_lat,end_lng';
const must = (result: { error: unknown }) => {
  if (result.error) throw result.error;
};
function sql(input: string) {
  return spawnSync('psql', ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1'], {
    input,
    encoding: 'utf8',
    timeout: 20_000,
    env: {
      NODE_ENV: 'test',
      PATH: process.env.PATH,
      PGHOST: new URL(url).hostname,
      PGPORT: '54322',
      PGUSER: 'postgres',
      PGDATABASE: 'postgres',
      PGPASSWORD: 'postgres',
      PGSSLMODE: 'disable',
    },
  });
}
async function fixture(partial = false): Promise<Ride> {
  const result = await admin
    .from('rides')
    .insert({
      poster_id: userId,
      posting_type: 'driver',
      start_location: 'Truckee',
      end_location: 'Reno',
      departure_date: '2099-01-01',
      departure_time: '12:00',
      start_lat: partial ? 39.42 : null,
    })
    .select(columns)
    .single();
  must(result);
  rideIds.push(result.data!.id);
  return result.data!;
}
const plan = (rides: Ride[]) => ({
  version: 1 as const,
  ref: 'abcdefghijklmnopqrst',
  approximate: true as const,
  entries: rides.map((ride) =>
    plannedEntry(ride, {
      Truckee: { lat: 39.3279, lng: -120.1835 },
      Reno: { lat: 39.5296, lng: -119.8138 },
    })
  ),
});
const triggerEnabled = () => {
  const result = sql(
    "SELECT tgenabled FROM pg_trigger WHERE tgrelid='public.rides'::regclass AND tgname='update_rides_updated_at';"
  );
  expect(result.status).toBe(0);
  expect(result.stdout.trim()).toBe('O');
};
beforeAll(async () => {
  const result = await admin.auth.admin.createUser({
    email: `coordinate-backfill-${crypto.randomUUID()}@example.test`,
    email_confirm: true,
  });
  must(result);
  userId = result.data.user!.id;
});
afterAll(async () => {
  if (rideIds.length) must(await admin.from('rides').delete().in('id', rideIds));
  if (userId) {
    must(await admin.auth.admin.deleteUser(userId));
    must(await admin.from('profiles').delete().eq('id', userId));
  }
});

it('native transaction preserves timestamps and existing axes, reports actual updates, and is idempotent', async () => {
  const complete = await fixture();
  const partial = await fixture(true);
  const input = applySQL(plan([complete, partial]));
  const result = sql(input);
  expect(result.status).toBe(0);
  expect(JSON.parse(result.stdout)).toEqual({ updatedRows: 2, updatedPairs: 3 });
  const { data, error } = await admin
    .from('rides')
    .select(columns)
    .in('id', [complete.id, partial.id]);
  must({ error });
  expect(data?.find((row) => row.id === complete.id)).toEqual({
    ...complete,
    start_lat: 39.3279,
    start_lng: -120.1835,
    end_lat: 39.5296,
    end_lng: -119.8138,
  });
  expect(data?.find((row) => row.id === partial.id)).toEqual({
    ...partial,
    end_lat: 39.5296,
    end_lng: -119.8138,
  });
  expect(JSON.parse(sql(input).stdout)).toEqual({ updatedRows: 0, updatedPairs: 0 });
  triggerEnabled();
});

it('native compare-and-set skips a concurrently edited row', async () => {
  const original = await fixture();
  must(await admin.from('rides').update({ start_location: 'Sacramento' }).eq('id', original.id));
  const result = sql(applySQL(plan([original])));
  expect(result.status).toBe(0);
  expect(JSON.parse(result.stdout)).toEqual({ updatedRows: 0, updatedPairs: 0 });
  expect(
    (await admin.from('rides').select('start_lat,end_lat').eq('id', original.id).single()).data
  ).toEqual({ start_lat: null, end_lat: null });
  triggerEnabled();
});

it('native failure rolls back both coordinate updates and trigger disabling', async () => {
  const original = await fixture();
  const input = applySQL(plan([original])).replace(
    'ALTER TABLE public.rides ENABLE TRIGGER',
    'SELECT 1/0; ALTER TABLE public.rides ENABLE TRIGGER'
  );
  expect(sql(input).status).not.toBe(0);
  expect((await admin.from('rides').select(columns).eq('id', original.id).single()).data).toEqual(
    original
  );
  triggerEnabled();
});
