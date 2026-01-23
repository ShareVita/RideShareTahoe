import {
  parseDate,
  formatDateToString,
  formatDateShort,
  formatDateMedium,
  formatDateLong,
  formatTime12Hour,
  normalizeTime,
  formatDateTime,
} from './dateTimeFormatters';

describe('dateTimeFormatters', () => {
  describe('parseDate', () => {
    it('parses YYYY-MM-DD string to Date object', () => {
      const result = parseDate('2025-01-15');
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(0); // January is 0
      expect(result.getDate()).toBe(15);
    });

    it('handles end of month correctly', () => {
      const result = parseDate('2025-02-28');
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(1); // February
      expect(result.getDate()).toBe(28);
    });

    it('handles leap year correctly', () => {
      const result = parseDate('2024-02-29');
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(1);
      expect(result.getDate()).toBe(29);
    });

    it('handles December correctly', () => {
      const result = parseDate('2025-12-31');
      expect(result.getMonth()).toBe(11); // December is 11
      expect(result.getDate()).toBe(31);
    });
  });

  describe('formatDateToString', () => {
    it('formats Date to YYYY-MM-DD string', () => {
      const date = new Date(2025, 0, 15); // January 15, 2025
      expect(formatDateToString(date)).toBe('2025-01-15');
    });

    it('pads single digit month with zero', () => {
      const date = new Date(2025, 4, 5); // May 5, 2025
      expect(formatDateToString(date)).toBe('2025-05-05');
    });

    it('pads single digit day with zero', () => {
      const date = new Date(2025, 11, 9); // December 9, 2025
      expect(formatDateToString(date)).toBe('2025-12-09');
    });

    it('handles December correctly', () => {
      const date = new Date(2025, 11, 25);
      expect(formatDateToString(date)).toBe('2025-12-25');
    });
  });

  describe('formatDateShort', () => {
    it('formats date to short format (e.g., "Jan 15")', () => {
      expect(formatDateShort('2025-01-15')).toBe('Jan 15');
    });

    it('formats December date correctly', () => {
      expect(formatDateShort('2025-12-25')).toBe('Dec 25');
    });

    it('handles single digit dates', () => {
      expect(formatDateShort('2025-03-05')).toBe('Mar 5');
    });
  });

  describe('formatDateMedium', () => {
    it('formats date to medium format (e.g., "Jan 15, 2025")', () => {
      expect(formatDateMedium('2025-01-15')).toBe('Jan 15, 2025');
    });

    it('formats December date correctly', () => {
      expect(formatDateMedium('2025-12-25')).toBe('Dec 25, 2025');
    });
  });

  describe('formatDateLong', () => {
    it('formats date to long format with weekday', () => {
      const result = formatDateLong('2025-01-15');
      expect(result).toContain('January');
      expect(result).toContain('15');
      expect(result).toContain('2025');
      expect(result).toContain('Wednesday');
    });

    it('formats Saturday correctly', () => {
      const result = formatDateLong('2025-01-18');
      expect(result).toContain('Saturday');
    });
  });

  describe('formatTime12Hour', () => {
    it('formats morning time correctly', () => {
      expect(formatTime12Hour('09:30')).toBe('9:30 AM');
    });

    it('formats afternoon time correctly', () => {
      expect(formatTime12Hour('14:30')).toBe('2:30 PM');
    });

    it('formats noon correctly', () => {
      expect(formatTime12Hour('12:00')).toBe('12:00 PM');
    });

    it('formats midnight correctly', () => {
      expect(formatTime12Hour('00:00')).toBe('12:00 AM');
    });

    it('handles HH:MM:SS format', () => {
      expect(formatTime12Hour('14:30:00')).toBe('2:30 PM');
    });

    it('returns "N/A" for null input', () => {
      expect(formatTime12Hour(null)).toBe('N/A');
    });

    it('returns "N/A" for undefined input', () => {
      expect(formatTime12Hour(undefined)).toBe('N/A');
    });

    it('returns "N/A" for empty string', () => {
      expect(formatTime12Hour('')).toBe('N/A');
    });

    it('handles 11 AM correctly', () => {
      expect(formatTime12Hour('11:00')).toBe('11:00 AM');
    });

    it('handles 1 AM correctly', () => {
      expect(formatTime12Hour('01:00')).toBe('1:00 AM');
    });

    it('handles 11 PM correctly', () => {
      expect(formatTime12Hour('23:00')).toBe('11:00 PM');
    });

    it('handles 1 PM correctly', () => {
      expect(formatTime12Hour('13:00')).toBe('1:00 PM');
    });
  });

  describe('normalizeTime', () => {
    it('converts HH:MM:SS to HH:MM', () => {
      expect(normalizeTime('14:30:00')).toBe('14:30');
    });

    it('keeps HH:MM format unchanged', () => {
      expect(normalizeTime('14:30')).toBe('14:30');
    });

    it('returns empty string for null', () => {
      expect(normalizeTime(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(normalizeTime(undefined)).toBe('');
    });

    it('returns input if no colon present', () => {
      expect(normalizeTime('1430')).toBe('1430');
    });
  });

  describe('formatDateTime', () => {
    it('formats complete date/time string', () => {
      const result = formatDateTime('2025-01-15', '14:30');
      expect(result).toBe('Wed, Jan 15 at 2:30 PM');
    });

    it('handles morning time', () => {
      const result = formatDateTime('2025-01-15', '09:00');
      expect(result).toBe('Wed, Jan 15 at 9:00 AM');
    });

    it('handles Saturday', () => {
      const result = formatDateTime('2025-01-18', '10:00');
      expect(result).toContain('Sat');
    });

    it('handles Sunday', () => {
      const result = formatDateTime('2025-01-19', '12:00');
      expect(result).toContain('Sun');
    });
  });
});
