/**
 * One-time operator CLI (Bun resolves @/ aliases). Never run automatically.
 * plan/apply <private-plan.json> <private-cache.json> <production-project-ref>
 * Required: BACKFILL_PRODUCTION_REF, PGHOST, PGPORT, PGDATABASE, PGUSER,
 * PGPASSWORD, PGSSLROOTCERT (trusted CA certificate file).
 * PGHOST must be db.<ref>.supabase.co or the Supabase session pooler;
 * pooler connections require postgres.<ref> on port 5432.
 * Plan additionally requires NOMINATIM_USER_AGENT (identifying app + contact),
 * NOMINATIM_REFERER (operator's public HTTPS site). No dotenv loading.
 * Points are approximate public-place points, NOT exact pickups.
 * Review the private plan before explicitly invoking apply; keep both files private.
 */
import { toPublicPlace } from '@/libs/rides/publicRides';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmdirSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';

type Point = { lat: number; lng: number };
export type Ride = {
  id: string;
  start_location: string;
  end_location: string;
  updated_at: string;
  start_lat: number | null;
  start_lng: number | null;
  end_lat: number | null;
  end_lng: number | null;
};
type Entry = { original: Ride; start: Point | null; end: Point | null };
type Plan = { version: 1; ref: string; approximate: true; entries: Entry[] };
type Cache = { version: 1; points: Record<string, Point | null>; notBefore?: number };

// Exact canonical names only: deliberately omit aliases, even benign ones.
export function publicLabel(raw: string): string | null {
  const name = raw
    .trim()
    .replace(
      /,\s*(?:(?:CA|NV|California|Nevada)(?:,\s*(?:USA|US|United States))?|USA|US|United States)$/i,
      ''
    )
    .trim();
  const label = toPublicPlace(name);
  if (['Lake Tahoe', 'North Lake Tahoe', 'Location shared after sign-in'].includes(label))
    return null;
  return name.toLowerCase() === label.toLowerCase() ? label : null;
}

export function validPoint(p: Point): boolean {
  return (
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lng) &&
    p.lat >= 36 &&
    p.lat <= 41 &&
    p.lng >= -124 &&
    p.lng <= -118
  );
}

type Match = {
  lat: string;
  lon: string;
  name?: string;
  type?: string;
  address?: { country_code?: string; state?: string };
};
export function choosePoint(matches: Match[], label: string): Point | null {
  if (publicLabel(label) !== label) return null;
  if (!Array.isArray(matches) || !matches.length || matches.length >= 40) return null;
  const points: Point[] = [];
  for (const m of matches) {
    if (
      !m ||
      typeof m.lat !== 'string' ||
      !m.lat.trim() ||
      typeof m.lon !== 'string' ||
      !m.lon.trim()
    )
      return null;
    const p = { lat: Number(m.lat), lng: Number(m.lon) };
    if (
      !validPoint(p) ||
      m.address?.country_code !== 'us' ||
      !['California', 'Nevada'].includes(m.address?.state ?? '') ||
      typeof m.name !== 'string' ||
      publicLabel(m.name) !== label ||
      ![
        'city',
        'town',
        'village',
        'hamlet',
        'administrative',
        'aerodrome',
        'ski_resort',
        'resort',
        'winter_sports',
      ].includes(m.type ?? '')
    )
      return null;
    points.push(p);
  }
  // All pairs, not just distances from the first result: duplicates within ~100m.
  for (const a of points)
    for (const b of points) {
      if (Math.hypot(a.lat - b.lat, (a.lng - b.lng) * Math.cos((a.lat * Math.PI) / 180)) > 0.001)
        return null;
    }
  return points[0];
}

export function plannedEntry(original: Ride, points: Record<string, Point | null>): Entry {
  const lookup = (side: 'start' | 'end') => {
    if (original[`${side}_lat`] !== null || original[`${side}_lng`] !== null) return null;
    const label = publicLabel(original[`${side}_location`]);
    return label ? (points[label] ?? null) : null;
  };
  return { original, start: lookup('start'), end: lookup('end') };
}

export function eligible(current: Ride, entry: Entry, side: 'start' | 'end'): boolean {
  return (
    !!entry[side] &&
    current.id === entry.original.id &&
    current.updated_at === entry.original.updated_at &&
    current.start_location === entry.original.start_location &&
    current.end_location === entry.original.end_location &&
    current[`${side}_lat`] === null &&
    current[`${side}_lng`] === null
  );
}

export function validatePlan(plan: Plan, ref: string): void {
  if (
    plan.version !== 1 ||
    plan.ref !== ref ||
    plan.approximate !== true ||
    !Array.isArray(plan.entries) ||
    plan.entries.length > 292
  )
    throw new Error('Invalid plan');
  const ids = new Set<string>();
  for (const e of plan.entries) {
    const r = e.original;
    if (
      !r ||
      !/^[0-9a-f-]{36}$/i.test(r.id) ||
      ids.has(r.id) ||
      typeof r.updated_at !== 'string' ||
      !Number.isFinite(Date.parse(r.updated_at)) ||
      typeof r.start_location !== 'string' ||
      typeof r.end_location !== 'string'
    )
      throw new Error('Invalid original');
    ids.add(r.id);
    for (const side of ['start', 'end'] as const) {
      if (
        e[side] !== null &&
        (!e[side] ||
          !validPoint(e[side]!) ||
          !publicLabel(r[`${side}_location`]) ||
          r[`${side}_lat`] !== null ||
          r[`${side}_lng`] !== null)
      )
        throw new Error('Unsafe coordinate pair');
    }
  }
}

// UTF-8 hex contains no SQL metacharacters. No text from a plan is interpolated as SQL.
export function applySQL(plan: Plan): string {
  validatePlan(plan, plan.ref);
  const hex = Buffer.from(JSON.stringify(plan.entries)).toString('hex');
  const updates = (['start', 'end'] as const)
    .map(
      (side) => `
    WITH updated AS (UPDATE public.rides r SET ${side}_lat = (e->'${side}'->>'lat')::numeric,
      ${side}_lng = (e->'${side}'->>'lng')::numeric
    FROM backfill_plan p CROSS JOIN LATERAL jsonb_array_elements(p.payload) e
    WHERE r.id = (e->'original'->>'id')::uuid AND e->'${side}' <> 'null'::jsonb
      AND r.start_location IS NOT DISTINCT FROM e->'original'->>'start_location'
      AND r.end_location IS NOT DISTINCT FROM e->'original'->>'end_location'
      AND r.updated_at = (e->'original'->>'updated_at')::timestamptz
      AND r.${side}_lat IS NULL AND r.${side}_lng IS NULL RETURNING r.id)
    INSERT INTO backfill_updates SELECT id, '${side}' FROM updated;`
    )
    .join('\n');
  return `BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '15s';
SET LOCAL idle_in_transaction_session_timeout = '15s';
LOCK TABLE public.rides IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.rides'::regclass
   AND tgname = 'update_rides_updated_at' AND tgenabled = 'O' AND NOT tgisinternal)
 THEN RAISE EXCEPTION 'Expected enabled timestamp trigger'; END IF;
END $$;
CREATE TEMP TABLE backfill_plan ON COMMIT DROP AS
 SELECT convert_from(decode('${hex}', 'hex'), 'UTF8')::jsonb AS payload;
CREATE TEMP TABLE backfill_updates (id uuid, side text) ON COMMIT DROP;
ALTER TABLE public.rides DISABLE TRIGGER update_rides_updated_at;
${updates}
ALTER TABLE public.rides ENABLE TRIGGER update_rides_updated_at;
SELECT json_build_object('updatedRows', count(DISTINCT id), 'updatedPairs', count(*)) FROM backfill_updates;
COMMIT;`;
}

function psql(sql: string): string {
  const env = Object.fromEntries(
    ['PGHOST', 'PGPORT', 'PGDATABASE', 'PGUSER', 'PGPASSWORD', 'PGSSLROOTCERT'].map((k) => [
      k,
      process.env[k] ?? '',
    ])
  );
  const result = spawnSync('psql', ['-X', '-w', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1'], {
    input: sql,
    encoding: 'utf8',
    timeout: 120_000,
    env: {
      NODE_ENV: 'production',
      PATH: process.env.PATH,
      ...env,
      PGSSLMODE: 'verify-full',
      PGCONNECT_TIMEOUT: '10',
    },
    maxBuffer: 10 * 1024 * 1024,
  });
  // Never relay stderr: PostgreSQL errors can contain private row data.
  if (result.error || result.status !== 0)
    throw new Error(
      'PostgreSQL operation failed; transaction connection closed (rollback if uncommitted)'
    );
  return result.stdout.trim();
}

function save(path: string, value: unknown): void {
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, JSON.stringify(value, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  renameSync(temporary, path);
}

export async function main(args: string[]): Promise<void> {
  // All runs on this machine must use the SAME cache path. A crash leaves a lock;
  // remove it manually only after confirming no other operator process is running.
  if (args.length !== 4) throw new Error('Expected mode, plan, cache, ref');
  const lock = `${resolve(args[2])}.lock`;
  mkdirSync(lock, { mode: 0o700 });
  try {
    await run(args);
  } finally {
    rmdirSync(lock);
  }
}

async function run(args: string[]): Promise<void> {
  const [mode, planPath, cachePath, ref] = args;
  if (
    args.length !== 4 ||
    !['plan', 'apply'].includes(mode) ||
    !/^[a-z0-9]{20}$/.test(ref) ||
    process.env.BACKFILL_PRODUCTION_REF !== ref ||
    process.env.PGDATABASE !== 'postgres' ||
    process.env.PGPORT !== '5432' ||
    !(
      (process.env.PGHOST === `db.${ref}.supabase.co` && process.env.PGUSER === 'postgres') ||
      (/^aws-[0-9]+-[a-z]+-[a-z]+-[0-9]+\.pooler\.supabase\.com$/.test(process.env.PGHOST ?? '') &&
        process.env.PGUSER === `postgres.${ref}`)
    )
  )
    throw new Error(
      'Usage: bun scripts/backfill-ride-coordinates.ts plan|apply PLAN CACHE REF; explicit production ref/host required'
    );
  for (const key of ['PGHOST', 'PGPORT', 'PGDATABASE', 'PGUSER', 'PGPASSWORD', 'PGSSLROOTCERT'])
    if (!process.env[key]) throw new Error(`Missing ${key}`);
  if (resolve(planPath) === resolve(cachePath)) throw new Error('Plan and cache must differ');
  if (mode === 'apply') {
    const plan: Plan = JSON.parse(readFileSync(planPath, 'utf8'));
    validatePlan(plan, ref);
    const counts = JSON.parse(psql(applySQL(plan)));
    console.log(JSON.stringify({ committed: true, plannedRows: plan.entries.length, ...counts }));
    return;
  }
  if (existsSync(planPath)) throw new Error('Refusing to overwrite review plan');
  const ua = process.env.NOMINATIM_USER_AGENT;
  const referer = process.env.NOMINATIM_REFERER;
  if (!ua || !/@|https:\/\//.test(ua) || !referer?.startsWith('https://'))
    throw new Error('Identifying Nominatim User-Agent/contact and HTTPS Referer required');
  const cache: Cache = existsSync(cachePath)
    ? JSON.parse(readFileSync(cachePath, 'utf8'))
    : { version: 1, points: {} };
  if (cache.version !== 1 || !cache.points || Array.isArray(cache.points))
    throw new Error('Invalid cache');
  if (
    cache.notBefore !== undefined &&
    (!Number.isFinite(cache.notBefore) || Date.now() < cache.notBefore)
  )
    throw new Error('Cache cooldown active or invalid');
  for (const [label, p] of Object.entries(cache.points))
    if (publicLabel(label) !== label || (p !== null && !validPoint(p)))
      throw new Error('Invalid cache point');
  // Four bounded pages in ONE repeatable-read snapshot, including an overflow
  // page. No geocoding/network wait occurs inside the database transaction.
  const pages = [0, 100, 200, 300]
    .map(
      (offset) => `SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM
    (SELECT id, start_location, end_location, updated_at, start_lat, start_lng, end_lat, end_lng
     FROM public.rides ORDER BY id LIMIT 100 OFFSET ${offset}) x;`
    )
    .join('\n');
  const rides: Ride[] = psql(`BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
    SET LOCAL statement_timeout = '15s';\n${pages}\nCOMMIT;`)
    .split('\n')
    .flatMap((line) => JSON.parse(line));
  if (rides.length !== 292)
    throw new Error('Expected exactly 292 legacy rides; review population before proceeding');
  const labels = new Set<string>();
  for (const r of rides)
    for (const side of ['start', 'end'] as const) {
      const label = publicLabel(r[`${side}_location`]);
      if (label && r[`${side}_lat`] === null && r[`${side}_lng`] === null) labels.add(label);
    }
  for (const label of labels) {
    if (Object.hasOwn(cache.points, label)) continue;
    await new Promise((resolve) => setTimeout(resolve, 4000));
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.search = new URLSearchParams({
      q: label,
      format: 'jsonv2',
      addressdetails: '1',
      countrycodes: 'us',
      viewbox: '-124,41,-118,36',
      bounded: '1',
      limit: '40',
    }).toString();
    const response = await fetch(url, {
      headers: { 'User-Agent': ua, Referer: referer },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      // Stop on ALL HTTP failures; persist Retry-After across resumptions.
      const retry = response.headers.get('retry-after');
      const seconds =
        retry && /^\d+$/.test(retry)
          ? Number(retry)
          : retry
            ? Math.ceil((Date.parse(retry) - Date.now()) / 1000)
            : 0;
      cache.notBefore = Date.now() + (Number.isFinite(seconds) ? Math.max(60, seconds) : 60) * 1000;
      save(cachePath, cache);
      throw new Error(
        `Geocoding stopped (${response.status}); do not resume for at least ${Number.isFinite(seconds) ? Math.max(60, seconds) : 60} seconds`
      );
    }
    cache.points[label] = choosePoint(await response.json(), label);
    save(cachePath, cache);
  }
  const entries = rides.map((r) => plannedEntry(r, cache.points)).filter((e) => e.start || e.end);
  const plan: Plan = { version: 1, ref, approximate: true, entries };
  validatePlan(plan, ref);
  save(planPath, plan);
  console.log(
    JSON.stringify({
      readRows: rides.length,
      plannedRows: entries.length,
      plannedPairs: entries.reduce((n, e) => n + Number(!!e.start) + Number(!!e.end), 0),
      skippedRows: rides.length - entries.length,
    })
  );
}

if (process.argv[1]?.endsWith('/backfill-ride-coordinates.ts')) {
  main(process.argv.slice(2)).catch(() => {
    // Detailed errors may contain raw remote content; only local operator-safe status.
    console.error(
      'Backfill stopped; no automatic retry. Check configuration, private files and operator cooldown (at least 60 seconds; honor server Retry-After).'
    );
    process.exitCode = 1;
  });
}
