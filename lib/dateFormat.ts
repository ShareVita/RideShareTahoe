/**
 * Formats an ISO-like date string into a human-readable label.
 *
 * Accepts values in the form `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ss...`
 * and returns a short, locale-formatted date (e.g. "Jan 5, 2026").
 *
 * @param value - A date string (with or without time) to format.
 * @returns A formatted date label or `null` if the input is invalid.
 */
export function formatDateLabel(value: string | null | undefined) {
  if (!value) return null;
  const [datePart] = value.split('T');
  if (!datePart) return null;
  const [year, month, day] = datePart.split('-').map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Formats a 24-hour time string into a 12-hour AM/PM label.
 *
 * Accepts values in the form `HH:mm` or `HH:mm:ss` and converts them
 * to a user-friendly time string (e.g. "3:30 PM").
 *
 * @param value - A time string in 24-hour format to format.
 * @returns A formatted time label or `null` if the input is invalid.
 */
export function formatTimeLabel(value: string | null | undefined) {
  if (!value) return null;
  const [hoursPart, minutesPart] = value.split(':');
  const parsedHours = Number(hoursPart);
  if (Number.isNaN(parsedHours)) return null;
  const minutes = minutesPart ? minutesPart.slice(0, 2) : '00';
  const normalizedMinutes = minutes.padEnd(2, '0');
  const hourIn12 = parsedHours % 12 === 0 ? 12 : parsedHours % 12;
  const period = parsedHours >= 12 ? 'PM' : 'AM';
  return `${hourIn12}:${normalizedMinutes} ${period}`;
}

export const TAHOE_TIME_ZONE = 'America/Los_Angeles';

/** Calendar day in Tahoe, independent of the browser/server timezone. */
export function tahoeDate(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TAHOE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/**
 * Convert a Tahoe wall-clock date/time to an instant. Reject invalid dates and
 * the spring DST gap; choose standard time (the later occurrence) in the fall,
 * matching PostgreSQL's AT TIME ZONE disambiguation.
 */
export function tahoeDateTime(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}(:\d{2})?$/.test(time)) {
    return null;
  }
  const wallTime = `${date}T${time.length === 5 ? `${time}:00` : time}`;
  const wallMs = Date.parse(`${wallTime}Z`);
  if (!Number.isFinite(wallMs)) return null;
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TAHOE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  // Tahoe uses PDT (UTC−7) and PST (UTC−8). Round-trip through Intl so
  // calendar normalization and nonexistent wall-clock times never slip through.
  for (const offset of [8, 7]) {
    const candidate = new Date(wallMs + offset * 60 * 60 * 1000);
    const parts = formatter.formatToParts(candidate);
    const get = (type: string) => parts.find((part) => part.type === type)!.value;
    const local = `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`;
    if (local === wallTime) return candidate;
  }
  return null;
}
