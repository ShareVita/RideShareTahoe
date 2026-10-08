import { test as nodeTest } from 'node:test';
import assert from 'node:assert/strict';
import {
  publicLabel,
  validPoint,
  choosePoint as selectPoint,
  plannedEntry,
  eligible,
  validatePlan,
  applySQL,
  type Ride,
} from './backfill-ride-coordinates';

// Use Jest's registrar in the repository suite, Node's supported registrar in Bun.
const test = globalThis.test ?? nodeTest;
const choosePoint = (matches: Parameters<typeof selectPoint>[0]) => selectPoint(matches, 'Truckee');
const ride: Ride = {
  id: '11111111-1111-4111-8111-111111111111',
  start_location: 'Truckee',
  end_location: 'Reno',
  updated_at: '2026-01-01T00:00:00.123456+00:00',
  start_lat: null,
  start_lng: null,
  end_lat: null,
  end_lng: null,
};
const point = { lat: 39.3, lng: -120.2 };
const entry = () => plannedEntry({ ...ride }, { Truckee: point, Reno: { lat: 39.5, lng: -119.8 } });
const plan = () => ({
  version: 1 as const,
  ref: 'abcdefghijklmnopqrst',
  approximate: true as const,
  entries: [entry()],
});
const match = (lat = '39.3', lon = '-120.2') => ({
  lat,
  lon,
  name: 'Truckee',
  type: 'town',
  address: { country_code: 'us', state: 'California' },
});

test('only exact canonical public names with optional comma-delimited state/country are accepted', () => {
  for (const text of [
    'Truckee',
    ' truckee ',
    'Truckee, CA',
    'Truckee, California, United States',
    'Truckee, USA',
  ])
    assert.equal(publicLabel(text), 'Truckee');
  for (const text of [
    '123 Truckee Road',
    'Oakland Avenue',
    'my home in Truckee',
    'Truckee or Reno',
    'Truckee / Reno',
    'Truckee, Reno',
    'Truckee to Tahoe City',
    'Truckee near Northstar',
    '<b>Truckee</b>',
    'Truckee\nprivate pickup',
    'Lake Tahoe',
    'North Lake Tahoe',
    'North Lake',
    'Bay Area',
    'unknown',
    'SLT',
    'Squaw Valley',
    'Truckee, NY',
    'Truckee, CA, USA, apt 4',
  ])
    assert.equal(publicLabel(text), null, text);
});

test('coordinate bounds are finite, numeric and inclusive; invalid response data is rejected', () => {
  for (const p of [{ lat: 36, lng: -124 }, { lat: 41, lng: -118 }, point]) assert.ok(validPoint(p));
  for (const p of [
    { lat: NaN, lng: -120 },
    { lat: Infinity, lng: -120 },
    { lat: 35.9999, lng: -120 },
    { lat: 41.0001, lng: -120 },
    { lat: 39, lng: -124.0001 },
    { lat: 39, lng: -117.9999 },
  ])
    assert.equal(validPoint(p), false);
  assert.equal(choosePoint([]), null);
  assert.equal(choosePoint([match('NaN')]), null);
  assert.equal(choosePoint([match('')]), null);
  assert.equal(choosePoint([{ ...match(), name: 'Reno' }]), null);
  assert.equal(choosePoint([{ ...match(), name: 'Truckee Private Apartments' }]), null);
  assert.equal(choosePoint([{ ...match(), type: 'residential' }]), null);
  assert.equal(selectPoint([match()], 'Truckee or Reno'), null);
  assert.equal(
    choosePoint([{ ...match(), address: { country_code: 'ca', state: 'California' } }]),
    null
  );
  assert.equal(
    choosePoint([{ ...match(), address: { country_code: 'us', state: 'Oregon' } }]),
    null
  );
  assert.equal(choosePoint(Array.from({ length: 40 }, () => match())), null);
});

test('all pairs reject asymmetric distinct results, even when both are close to first', () => {
  assert.deepEqual(choosePoint([match()]), point);
  assert.deepEqual(choosePoint([match(), match('39.30001')]), point);
  assert.equal(choosePoint([match(), match('39.3008'), match('39.2992')]), null);
  assert.equal(choosePoint([match(), match('39.8')]), null);
  assert.equal(choosePoint([match(), match('39.3', '-119')]), null);
});

test('missing pairs only: never mix an existing axis with a new one', () => {
  for (const original of [
    { ...ride, start_lat: 0 },
    { ...ride, start_lng: -120 },
    { ...ride, start_lat: 39, start_lng: -120 },
  ]) {
    const e = plannedEntry(original, { Truckee: point, Reno: point });
    assert.equal(e.start, null);
    assert.deepEqual(e.end, point);
  }
  assert.equal(
    plannedEntry({ ...ride, start_location: '123 Truckee Road' }, { Truckee: point }).start,
    null
  );
  assert.equal(plannedEntry(ride, { Truckee: null }).start, null);
});

test('CAS skips stale timestamps, location edits, row replacements and newly populated axes', () => {
  assert.ok(eligible(ride, entry(), 'start'));
  for (const current of [
    { ...ride, updated_at: '2026-01-02T00:00:00Z' },
    { ...ride, start_location: 'Truckee, CA' },
    { ...ride, end_location: 'Sacramento' },
    { ...ride, id: '22222222-2222-4222-8222-222222222222' },
    { ...ride, start_lat: 0 },
    { ...ride, start_lng: 0 },
  ])
    assert.equal(eligible(current, entry(), 'start'), false);
  assert.ok(eligible({ ...ride, end_lat: 39 }, entry(), 'start'));
});

test('plan validation rejects ref mismatch, duplicate rows, unsafe pairs and tampered points', () => {
  validatePlan(plan(), plan().ref);
  assert.throws(() => validatePlan(plan(), 'wrong'));
  assert.throws(() => validatePlan({ ...plan(), entries: [entry(), entry()] }, plan().ref));
  assert.throws(() =>
    validatePlan(
      { ...plan(), entries: [{ ...entry(), original: { ...ride, start_lat: 39 } }] },
      plan().ref
    )
  );
  assert.throws(() =>
    validatePlan({ ...plan(), entries: [{ ...entry(), start: { lat: 90, lng: 0 } }] }, plan().ref)
  );
  assert.throws(() =>
    validatePlan(
      {
        ...plan(),
        entries: [{ ...entry(), original: { ...ride, start_location: 'Truckee or Reno' } }],
      },
      plan().ref
    )
  );
});

test('SQL is encoded data, locks before disabling only named trigger and preserves timestamps', () => {
  const malicious = "private '); COMMIT; DROP TABLE rides; -- \\ 雪";
  const e = { ...entry(), original: { ...ride, end_location: malicious }, end: null };
  const sql = applySQL({ ...plan(), entries: [e] });
  assert.ok(!sql.includes(malicious));
  const hex = sql.match(/decode\('([a-f0-9]+)', 'hex'\)/)?.[1];
  assert.ok(hex);
  assert.deepEqual(JSON.parse(Buffer.from(hex, 'hex').toString('utf8')), [e]);
  assert.ok(sql.indexOf('LOCK TABLE') < sql.indexOf('DISABLE TRIGGER'));
  assert.ok(sql.indexOf("tgenabled = 'O'") < sql.indexOf('DISABLE TRIGGER'));
  assert.ok(sql.indexOf('ENABLE TRIGGER') < sql.lastIndexOf('COMMIT;'));
  assert.ok(
    sql.includes('lock_timeout') &&
      sql.includes('statement_timeout') &&
      sql.includes('idle_in_transaction_session_timeout')
  );
  assert.equal((sql.match(/DISABLE TRIGGER/g) ?? []).length, 1);
  assert.ok(!sql.includes('TRIGGER ALL') && !/SET\s+updated_at/.test(sql));
  for (const side of ['start', 'end'])
    assert.ok(sql.includes(`r.${side}_lat IS NULL AND r.${side}_lng IS NULL`));
  assert.ok(
    sql.includes('r.updated_at =') &&
      sql.includes('r.start_location IS NOT DISTINCT FROM') &&
      sql.includes('r.end_location IS NOT DISTINCT FROM')
  );
});
