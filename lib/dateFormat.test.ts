import { tahoeDate, tahoeDateTime } from './dateFormat';

describe('Tahoe calendar and wall-clock time', () => {
  it('keeps the Pacific day across UTC midnight and changes at Pacific midnight', () => {
    expect(tahoeDate(new Date('2026-07-05T00:30:00Z'))).toBe('2026-07-04');
    expect(tahoeDate(new Date('2026-07-05T07:00:00Z'))).toBe('2026-07-05');
    expect(tahoeDate(new Date('2026-01-05T07:59:59Z'))).toBe('2026-01-04');
    expect(tahoeDate(new Date('2026-01-05T08:00:00Z'))).toBe('2026-01-05');
  });

  it.each([
    ['2026-01-15', '08:45', '2026-01-15T16:45:00.000Z'],
    ['2026-07-15', '08:45:12', '2026-07-15T15:45:12.000Z'],
    ['2026-03-08', '01:59', '2026-03-08T09:59:00.000Z'],
    ['2026-03-08', '03:00', '2026-03-08T10:00:00.000Z'],
    ['2026-11-01', '01:30', '2026-11-01T09:30:00.000Z'],
    ['2026-11-01', '02:00', '2026-11-01T10:00:00.000Z'],
  ])('converts %s %s independently of host timezone', (date, time, expected) => {
    expect(tahoeDateTime(date, time)?.toISOString()).toBe(expected);
  });

  it.each([
    ['2026-03-08', '02:30'],
    ['2026-02-30', '08:00'],
    ['2026-07-15', '24:00'],
    ['2026-07-15', '08:61'],
    ['invalid', '08:00'],
  ])('rejects nonexistent or invalid %s %s', (date, time) => {
    expect(tahoeDateTime(date, time)).toBeNull();
  });
});
