'use client';

import { useState, useRef, useEffect } from 'react';
import { parseDate, formatDateToString, formatDateShort } from '@/libs/dateTimeFormatters';

interface DatePickerProps {
  selectedDates: string[];
  // eslint-disable-next-line no-unused-vars
  onDatesChange: (dates: string[]) => void;
  minDate?: string;
  maxDate?: string;
  placeholder?: string;
  /** When true, only allows selecting one date at a time */
  singleSelect?: boolean;
  /** Optional label shown above the picker */
  label?: string;
  /** Whether the field is required */
  required?: boolean;
}

/**
 * Supports single and multiple date selection with visual feedback.
 * Shows up to 7 dates before displaying "+X more"
 * Use singleSelect={true} to restrict to one date only.
 */
export default function DatePicker({
  selectedDates,
  onDatesChange,
  minDate,
  maxDate,
  placeholder = 'Select dates',
  singleSelect = false,
  label,
  required = false,
}: Readonly<DatePickerProps>) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Generate calendar days
  const getDaysInMonth = (date: Date): (Date | null)[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    return days;
  };

  // Check if date is disabled
  const isDisabled = (date: Date | null): boolean => {
    if (!date) return false;

    const minDateObj = minDate ? parseDate(minDate) : new Date();
    minDateObj.setHours(0, 0, 0, 0);
    if (date < minDateObj) return true;

    if (maxDate) {
      const maxDateObj = parseDate(maxDate);
      maxDateObj.setHours(23, 59, 59, 999);
      if (date > maxDateObj) return true;
    }

    return false;
  };

  // Check if date is selected
  const isSelected = (date: Date | null): boolean => {
    if (!date) return false;
    const dateStr = formatDateToString(date);
    return selectedDates.includes(dateStr);
  };

  // Check if date is today
  const isToday = (date: Date | null): boolean => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Handle date selection/deselection
  const handleDateClick = (date: Date | null) => {
    if (!date || isDisabled(date)) return;

    const dateStr = formatDateToString(date);

    if (singleSelect) {
      // Single select mode: replace the selection and close
      onDatesChange([dateStr]);
      setIsOpen(false);
    } else if (selectedDates.includes(dateStr)) {
      // Multi-select: Remove date
      onDatesChange(selectedDates.filter((d) => d !== dateStr));
    } else {
      // Multi-select: Add date
      onDatesChange([...selectedDates, dateStr].sort());
    }
  };

  // Handle quick select for today
  const handleSelectToday = () => {
    const today = new Date();
    if (!isDisabled(today)) {
      handleDateClick(today);
    }
  };

  // Handle quick select for tomorrow
  const handleSelectTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (!isDisabled(tomorrow)) {
      handleDateClick(tomorrow);
    }
  };

  // Remove individual date chip
  const removeDate = (dateStr: string) => {
    onDatesChange(selectedDates.filter((d) => d !== dateStr));
  };

  // Clear all dates
  const clearAll = () => {
    onDatesChange([]);
  };

  // Navigation
  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const days = getDaysInMonth(currentMonth);
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Show up to 7 dates before "+X more"
  const maxVisibleDates = 7;

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Input Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 ${singleSelect ? 'py-2' : 'py-3'} border-2 border-gray-300 dark:border-slate-600 rounded-lg
                   focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
                   bg-white dark:bg-slate-800 text-left flex items-center justify-between
                   transition-all duration-200 hover:border-gray-400 dark:hover:border-slate-500`}
      >
        <div className="flex-1 min-w-0">
          {selectedDates.length === 0 ? (
            <span className="text-gray-500 dark:text-gray-400">{placeholder}</span>
          ) : singleSelect ? (
            // Single select: show just the date text
            <span className="text-gray-900 dark:text-white">
              {formatDateShort(selectedDates[0])}
            </span>
          ) : (
            // Multi-select: show date chips
            <div className="flex flex-wrap gap-1.5">
              {selectedDates.slice(0, maxVisibleDates).map((dateStr) => (
                <span
                  key={dateStr}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30
                             text-blue-800 dark:text-blue-200 text-sm rounded-md font-medium"
                >
                  {formatDateShort(dateStr)}
                </span>
              ))}
              {selectedDates.length > maxVisibleDates && (
                <span className="text-sm text-gray-600 dark:text-gray-400 px-2 py-0.5">
                  +{selectedDates.length - maxVisibleDates} more
                </span>
              )}
            </div>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 flex-shrink-0 ml-2 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Calendar Dropdown */}
      {isOpen && (
        <div
          className={`absolute top-full left-0 mt-2 bg-white dark:bg-slate-800
                      border-2 border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl z-50
                      ${singleSelect ? 'p-4 min-w-[300px]' : 'p-6 w-full min-w-[420px]'}`}
        >
          {/* Selected Dates Chips - only show in multi-select mode */}
          {!singleSelect && selectedDates.length > 0 && (
            <div className="mb-4 pb-4 border-b border-gray-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Selected Dates ({selectedDates.length})
                </span>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs text-red-600 dark:text-red-400 font-medium px-2 py-1 rounded
                             hover:text-white hover:bg-red-600 dark:hover:bg-red-500
                             hover:shadow-md hover:border hover:border-red-700
                             transition-all duration-200"
                >
                  Clear All
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedDates.map((dateStr) => (
                  <span
                    key={dateStr}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5
                               bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200
                               text-sm rounded-lg font-medium"
                  >
                    {formatDateShort(dateStr)}
                    <button
                      type="button"
                      onClick={() => removeDate(dateStr)}
                      className="hover:bg-blue-200 dark:hover:bg-blue-800/50 rounded-full p-0.5
                                 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button
              type="button"
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg
                         transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h3>

            <button
              type="button"
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg
                         transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>

          {/* Day Names */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {dayNames.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-semibold text-gray-600 dark:text-gray-400 py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {days.map((date, index) => {
              const selected = isSelected(date);
              const disabled = isDisabled(date);
              const today = isToday(date);

              return (
                <button
                  key={date ? date.toISOString() : `empty-${index}`}
                  type="button"
                  onClick={() => handleDateClick(date)}
                  disabled={disabled || !date}
                  className={`
                    h-11 text-sm rounded-lg transition-all duration-150
                    ${!date ? 'cursor-default' : ''}
                    ${
                      disabled
                        ? 'text-gray-300 dark:text-gray-700 cursor-not-allowed opacity-40'
                        : 'cursor-pointer'
                    }
                    ${
                      selected
                        ? 'bg-blue-600 text-white font-bold shadow-md hover:bg-blue-700'
                        : today && !selected
                          ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 font-semibold hover:bg-blue-200 dark:hover:bg-blue-900/30'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                    }
                  `}
                >
                  {date ? date.getDate() : ''}
                </button>
              );
            })}
          </div>

          {/* Quick Select Buttons - show in single select mode */}
          {singleSelect && (
            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-slate-700 space-y-2">
              <button
                type="button"
                onClick={handleSelectToday}
                className="w-full text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
              >
                Select Today
              </button>
              <button
                type="button"
                onClick={handleSelectTomorrow}
                className="w-full text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
              >
                Select Tomorrow
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
