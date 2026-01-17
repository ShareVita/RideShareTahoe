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
