'use client';

import React, { useState, useMemo } from 'react';

interface TimeInputProps {
  value: string; // 24-hour format "HH:MM"
  // eslint-disable-next-line no-unused-vars
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  required?: boolean;
}

/**
 * Smart time input with separate AM/PM toggle buttons.
 * Accepts various input formats and auto-converts to 12-hour display.
 * Stores in 24-hour format for database compatibility.
 */
export default function TimeInput({
  value,
  onChange,
  label,
  error,
  required = false,
}: Readonly<TimeInputProps>) {
  // Local draft state while typing
  const [draftValue, setDraftValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [invalidInput, setInvalidInput] = useState(false);

  // Derive display value + period from controlled value
  const { derivedDisplay, derivedPeriod } = useMemo(() => {
    if (!value || !/^\d{2}:\d{2}$/.test(value)) {
      return { derivedDisplay: '', derivedPeriod: 'AM' as const };
    }

    const [hours24, minutes] = value.split(':').map(Number);
    const isPM = hours24 >= 12;
    const hours12 = hours24 % 12 || 12;

    return {
      derivedDisplay: `${hours12}:${String(minutes).padStart(2, '0')}`,
      derivedPeriod: isPM ? 'PM' : 'AM',
    };
  }, [value]);

  const displayValue = isFocused ? draftValue : invalidInput ? draftValue : derivedDisplay;
  const period = derivedPeriod;
  const hasError = error || invalidInput;

  /**
   * Parse various input formats:
   * - "330" → "3:30"
   * - "930a" → "9:30 AM"
   * - "3:30" → "3:30"
   * - "15:30" → "3:30 PM"
   */
  const parseTimeInput = (input: string): { hours: number; minutes: number } | null => {
    const cleaned = input.trim().toLowerCase();

    const shortMatch = cleaned.match(/^(\d{1,2})(\d{2})([ap]?)$/);
    if (shortMatch) {
      const hours = Number(shortMatch[1]);
      const minutes = Number(shortMatch[2]);
      const hint = shortMatch[3];

      if (hours <= 23 && minutes <= 59) {
        let h = hours;
        if (hint === 'p' && h < 12) h += 12;
        if (hint === 'a' && h === 12) h = 0;
        return { hours: h, minutes };
      }
    }

    const colonMatch = cleaned.match(/^(\d{1,2}):(\d{2})$/);
    if (colonMatch) {
      const hours = Number(colonMatch[1]);
      const minutes = Number(colonMatch[2]);
      if (hours <= 23 && minutes <= 59) {
        return { hours, minutes };
      }
    }

    return null;
  };

  const handleBlur = () => {
    setIsFocused(false);

    // If empty, just clear without error
    if (!draftValue.trim()) {
      setDraftValue('');
      setInvalidInput(false);
      onChange('');
      return;
    }

    const parsed = parseTimeInput(draftValue);
    if (!parsed) {
      // Keep the invalid input visible and show error
      setInvalidInput(true);
      return;
    }

    setInvalidInput(false);
    const { hours, minutes } = parsed;
    onChange(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
    setDraftValue('');
  };

  const togglePeriod = (newPeriod: 'AM' | 'PM') => {
    if (!derivedDisplay) return;

    const [h12, m] = derivedDisplay.split(':').map(Number);
    let h24 = h12 % 12;

    if (newPeriod === 'PM') h24 += 12;
    if (newPeriod === 'AM' && h12 === 12) h24 = 0;

    onChange(`${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="flex gap-2 items-center">
        <div className="flex-1 relative">
          <input
            type="text"
            value={displayValue}
            onChange={(e) => setDraftValue(e.target.value)}
            onFocus={() => {
              setIsFocused(true);
              setInvalidInput(false);
              setDraftValue(invalidInput ? draftValue : derivedDisplay);
            }}
            onBlur={handleBlur}
            placeholder="9:30"
            className={`
              w-full px-3 py-2 rounded-lg border-2
              bg-white dark:bg-slate-800
              text-gray-900 dark:text-white
              focus:outline-none focus:ring-2
              ${
                hasError
                  ? 'border-red-300 focus:ring-red-500/20'
                  : 'border-gray-300 focus:ring-blue-500/20'
              }
            `}
          />
        </div>

        {(['AM', 'PM'] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => togglePeriod(p)}
            className={`
              px-3 py-2 rounded-lg font-semibold text-xs min-w-[45px] transition-colors
              ${
                period === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300'
              }
            `}
          >
            {p}
          </button>
        ))}
      </div>

      {(error || invalidInput) && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error || 'Invalid time format. Try 9:30 or 930'}
        </p>
      )}
    </div>
  );
}
