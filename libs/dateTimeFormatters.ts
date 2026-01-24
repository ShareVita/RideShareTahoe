/**
 * Shared date/time formatting utilities for the ride sharing app
 *
 * This module provides consistent date and time formatting across the application.
 * All date strings are expected in YYYY-MM-DD format.
 * All time strings are expected in HH:MM or HH:MM:SS format (24-hour).
 */

/**
 * Parse YYYY-MM-DD string to Date object (avoiding timezone issues)
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Date object set to local midnight
 *
 * @example
 * parseDate('2025-01-15') // Returns Date object for Jan 15, 2025 at 00:00:00
 */
export const parseDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Format Date object to YYYY-MM-DD string
 *
 * @param date - Date object to format
 * @returns Date string in YYYY-MM-DD format
 *
 * @example
 * formatDateToString(new Date(2025, 0, 15)) // Returns '2025-01-15'
 */
export const formatDateToString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Format date string to short display format
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Formatted date (e.g., "Jan 15")
 *
 * @example
 * formatDateShort('2025-01-15') // Returns 'Jan 15'
 */
export const formatDateShort = (dateStr: string): string => {
  const date = parseDate(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Format date string to medium display format
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Formatted date (e.g., "Jan 15, 2025")
 *
 * @example
 * formatDateMedium('2025-01-15') // Returns 'Jan 15, 2025'
 */
export const formatDateMedium = (dateStr: string): string => {
  const date = parseDate(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Format date string to long display format
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Formatted date (e.g., "Monday, January 15, 2025")
 *
 * @example
 * formatDateLong('2025-01-15') // Returns 'Monday, January 15, 2025'
 */
export const formatDateLong = (dateStr: string): string => {
  const date = parseDate(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Format 24-hour time to 12-hour format with AM/PM
 *
 * @param timeStr - Time string in HH:MM or HH:MM:SS format (24-hour)
 * @returns Formatted time (e.g., "2:30 PM") or "N/A" if null/undefined
 *
 * @example
 * formatTime12Hour('14:30') // Returns '2:30 PM'
 * formatTime12Hour('09:00') // Returns '9:00 AM'
 * formatTime12Hour(null) // Returns 'N/A'
 */
export const formatTime12Hour = (timeStr: string | null | undefined): string => {
  if (!timeStr) return 'N/A';

  const timeParts = timeStr.split(':');
  let hours = parseInt(timeParts[0], 10);
  const minutes = timeParts[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;

  return `${hours}:${minutes} ${ampm}`;
};

/**
 * Normalize time from HH:MM:SS to HH:MM format
 *
 * @param time - Time string in any format
 * @returns Time string in HH:MM format, or empty string if null/undefined
 *
 * @example
 * normalizeTime('14:30:00') // Returns '14:30'
 * normalizeTime('14:30') // Returns '14:30'
 * normalizeTime(null) // Returns ''
 */
export const normalizeTime = (time?: string | null): string => {
  if (!time) return '';
  if (time.includes(':')) {
    const parts = time.split(':');
    return `${parts[0]}:${parts[1]}`;
  }
  return time;
};

/**
 * Format complete date/time string for display
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param timeStr - Time string in HH:MM or HH:MM:SS format
 * @returns Formatted date/time (e.g., "Mon, Jan 15 at 2:30 PM")
 *
 * @example
 * formatDateTime('2025-01-15', '14:30') // Returns 'Wed, Jan 15 at 2:30 PM'
 */
export const formatDateTime = (dateStr: string, timeStr: string): string => {
  const date = parseDate(dateStr);
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
  const formattedDate = formatDateShort(dateStr);
  const formattedTime = formatTime12Hour(timeStr);

  return `${dayName}, ${formattedDate} at ${formattedTime}`;
};
