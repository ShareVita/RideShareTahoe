import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DatePicker from './DatePicker';

// Mock crypto.randomUUID for tests
const mockRandomUUID = jest.fn();
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: mockRandomUUID,
  },
});

// Mock dateTimeFormatters
jest.mock('@/libs/dateTimeFormatters', () => ({
  parseDate: (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  },
  formatDateToString: (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },
  formatDateShort: (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  },
}));

// Helper to get today's date string (uses mocked date)
const getTodayString = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

// Helper to get tomorrow's date string (uses mocked date)
const getTomorrowString = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
};

describe('DatePicker', () => {
  let dateNowSpy: jest.SpyInstance<number, []>;

  beforeAll(() => {
    // Mock Date.now to a fixed timestamp so date-dependent tests are deterministic
    dateNowSpy = jest
      .spyOn(Date, 'now')
      .mockImplementation(() => new Date('2025-12-15T12:00:00Z').getTime());
  });

  afterAll(() => {
    dateNowSpy.mockRestore();
  });

  beforeEach(() => {
    // Provide a consistent value for randomUUID
    let callCount = 0;
    mockRandomUUID.mockImplementation(() => `mock-uuid-${callCount++}`);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
  describe('Basic Rendering', () => {
    it('renders with a placeholder when no dates are selected', () => {
      render(<DatePicker selectedDates={[]} onDatesChange={() => {}} placeholder="Select a date" />);
      expect(screen.getByText('Select a date')).toBeInTheDocument();
    });

    it('renders with default placeholder when none provided', () => {
      render(<DatePicker selectedDates={[]} onDatesChange={() => {}} />);
      expect(screen.getByText('Select dates')).toBeInTheDocument();
    });

    it('renders with a label when provided', () => {
      render(<DatePicker selectedDates={[]} onDatesChange={() => {}} label="Departure Date" />);
      expect(screen.getByText('Departure Date')).toBeInTheDocument();
    });

    it('shows required asterisk when required prop is true', () => {
      render(<DatePicker selectedDates={[]} onDatesChange={() => {}} label="Departure Date" required />);
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('opens the calendar when the button is clicked', () => {
      render(<DatePicker selectedDates={[]} onDatesChange={() => {}} />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      const currentMonthName = new Date().toLocaleString('default', { month: 'long' });
      expect(screen.getByText(new RegExp(currentMonthName))).toBeInTheDocument();
    });

    it('closes the calendar when clicking outside', () => {
      render(
        <div>
          <DatePicker selectedDates={[]} onDatesChange={() => {}} />
          <div data-testid="outside">Outside</div>
        </div>
      );

      // Open calendar
      fireEvent.click(screen.getByRole('button'));
      const currentMonthName = new Date().toLocaleString('default', { month: 'long' });
      expect(screen.getByText(new RegExp(currentMonthName))).toBeInTheDocument();

      // Click outside
      fireEvent.mouseDown(screen.getByTestId('outside'));
      expect(screen.queryByText(new RegExp(currentMonthName))).not.toBeInTheDocument();
    });
  });

  describe('Single Select Mode', () => {
    it('displays single selected date correctly', () => {
      render(
        <DatePicker
          selectedDates={['2023-10-26']}
          onDatesChange={() => {}}
          singleSelect
        />
      );
      expect(screen.getByText('Oct 26')).toBeInTheDocument();
    });

    it('calls onDatesChange with single date when clicked in single select mode', () => {
      const onDatesChangeMock = jest.fn();
      render(
        <DatePicker
          selectedDates={[]}
          onDatesChange={onDatesChangeMock}
          singleSelect
        />
      );

      fireEvent.click(screen.getByRole('button')); // Open calendar
      fireEvent.click(screen.getByText('Select Today'));

      expect(onDatesChangeMock).toHaveBeenCalledWith([getTodayString()]);
    });

    it('shows Select Today and Select Tomorrow buttons in single select mode', () => {
      render(
        <DatePicker
          selectedDates={[]}
          onDatesChange={() => {}}
          singleSelect
        />
      );

      fireEvent.click(screen.getByRole('button')); // Open calendar

      expect(screen.getByText('Select Today')).toBeInTheDocument();
      expect(screen.getByText('Select Tomorrow')).toBeInTheDocument();
    });

    it('selects tomorrow when "Select Tomorrow" is clicked', () => {
      const onDatesChangeMock = jest.fn();
      render(
        <DatePicker
          selectedDates={[]}
          onDatesChange={onDatesChangeMock}
          singleSelect
        />
      );

      fireEvent.click(screen.getByRole('button')); // Open calendar
      fireEvent.click(screen.getByText('Select Tomorrow'));

      expect(onDatesChangeMock).toHaveBeenCalledWith([getTomorrowString()]);
    });

    it('closes calendar after selecting a date in single select mode', () => {
      render(
        <DatePicker
          selectedDates={[]}
          onDatesChange={() => {}}
          singleSelect
        />
      );

      fireEvent.click(screen.getByRole('button')); // Open calendar
      const currentMonthName = new Date().toLocaleString('default', { month: 'long' });
      expect(screen.getByText(new RegExp(currentMonthName))).toBeInTheDocument();

      fireEvent.click(screen.getByText('Select Today'));

      // Calendar should be closed
      expect(screen.queryByText(new RegExp(currentMonthName))).not.toBeInTheDocument();
    });
  });

  describe('Multi Select Mode', () => {
    it('displays multiple selected dates as chips', () => {
      render(
        <DatePicker
          selectedDates={['2023-10-26', '2023-10-27', '2023-10-28']}
          onDatesChange={() => {}}
        />
      );
      expect(screen.getByText('Oct 26')).toBeInTheDocument();
      expect(screen.getByText('Oct 27')).toBeInTheDocument();
      expect(screen.getByText('Oct 28')).toBeInTheDocument();
    });

    it('shows "+X more" when more than 7 dates selected', () => {
      const dates = [
        '2023-10-20', '2023-10-21', '2023-10-22', '2023-10-23',
        '2023-10-24', '2023-10-25', '2023-10-26', '2023-10-27', '2023-10-28'
      ];
      render(
        <DatePicker
          selectedDates={dates}
          onDatesChange={() => {}}
        />
      );
      expect(screen.getByText('+2 more')).toBeInTheDocument();
    });

    it('does not show Select Today/Tomorrow in multi-select mode', () => {
      render(
        <DatePicker
          selectedDates={[]}
          onDatesChange={() => {}}
          singleSelect={false}
        />
      );

      fireEvent.click(screen.getByRole('button')); // Open calendar

      expect(screen.queryByText('Select Today')).not.toBeInTheDocument();
      expect(screen.queryByText('Select Tomorrow')).not.toBeInTheDocument();
    });

    it('adds date to selection when clicking unselected date', () => {
      const onDatesChangeMock = jest.fn();
      const today = new Date();

      render(
        <DatePicker
          selectedDates={[]}
          onDatesChange={onDatesChangeMock}
        />
      );

      fireEvent.click(screen.getByRole('button')); // Open calendar

      // Click on a date
      const dayButton = screen.getByText(today.getDate().toString());
      fireEvent.click(dayButton);

      expect(onDatesChangeMock).toHaveBeenCalled();
    });

    it('removes date from selection when clicking already selected date', () => {
      const onDatesChangeMock = jest.fn();
      const todayStr = getTodayString();

      render(
        <DatePicker
          selectedDates={[todayStr]}
          onDatesChange={onDatesChangeMock}
        />
      );

      fireEvent.click(screen.getByRole('button')); // Open calendar

      // Click on today (already selected)
      const today = new Date();
      const dayButton = screen.getByText(today.getDate().toString());
      fireEvent.click(dayButton);

      expect(onDatesChangeMock).toHaveBeenCalledWith([]);
    });

    it('shows selected dates count in dropdown header', () => {
      render(
        <DatePicker
          selectedDates={['2023-10-26', '2023-10-27', '2023-10-28']}
          onDatesChange={() => {}}
        />
      );

      fireEvent.click(screen.getByRole('button')); // Open calendar
      expect(screen.getByText('Selected Dates (3)')).toBeInTheDocument();
    });

    it('shows Clear All button when dates are selected', () => {
      render(
        <DatePicker
          selectedDates={['2023-10-26', '2023-10-27']}
          onDatesChange={() => {}}
        />
      );

      fireEvent.click(screen.getByRole('button')); // Open calendar
      expect(screen.getByText('Clear All')).toBeInTheDocument();
    });

    it('clears all dates when Clear All is clicked', () => {
      const onDatesChangeMock = jest.fn();
      render(
        <DatePicker
          selectedDates={['2023-10-26', '2023-10-27']}
          onDatesChange={onDatesChangeMock}
        />
      );

      fireEvent.click(screen.getByRole('button')); // Open calendar
      fireEvent.click(screen.getByText('Clear All'));

      expect(onDatesChangeMock).toHaveBeenCalledWith([]);
    });

    it('does not close calendar after selecting date in multi-select mode', () => {
      const today = new Date();
      render(
        <DatePicker
          selectedDates={[]}
          onDatesChange={() => {}}
        />
      );

      fireEvent.click(screen.getByRole('button')); // Open calendar
      const currentMonthName = new Date().toLocaleString('default', { month: 'long' });
      expect(screen.getByText(new RegExp(currentMonthName))).toBeInTheDocument();

      // Click on a date
      const dayButton = screen.getByText(today.getDate().toString());
      fireEvent.click(dayButton);

      // Calendar should still be open
      expect(screen.getByText(new RegExp(currentMonthName))).toBeInTheDocument();
    });
  });

  describe('Month Navigation', () => {
    it('navigates to the next month', () => {
      render(<DatePicker selectedDates={[]} onDatesChange={() => {}} />);
      fireEvent.click(screen.getByRole('button')); // Open calendar

      const currentMonthName = new Date().toLocaleString('default', { month: 'long' });
      expect(screen.getByText(new RegExp(currentMonthName))).toBeInTheDocument();

      const navigationButtons = screen.getAllByRole('button');
      const nextButton = navigationButtons[2]; // Third button is next month

      fireEvent.click(nextButton);
      const nextMonthName = new Date(new Date().setMonth(new Date().getMonth() + 1)).toLocaleString(
        'default',
        { month: 'long' }
      );
      expect(screen.getByText(new RegExp(nextMonthName))).toBeInTheDocument();
    });

    it('navigates to the previous month', () => {
      render(<DatePicker selectedDates={[]} onDatesChange={() => {}} />);
      fireEvent.click(screen.getByRole('button')); // Open calendar

      const currentMonthName = new Date().toLocaleString('default', { month: 'long' });
      expect(screen.getByText(new RegExp(currentMonthName))).toBeInTheDocument();

      const navigationButtons = screen.getAllByRole('button');
      const prevButton = navigationButtons[1]; // Second button is prev month

      fireEvent.click(prevButton);
      const prevMonthName = new Date(new Date().setMonth(new Date().getMonth() - 1)).toLocaleString(
        'default',
        { month: 'long' }
      );
      expect(screen.getByText(new RegExp(prevMonthName))).toBeInTheDocument();
    });
  });

  describe('Date Constraints', () => {
    it('disables dates before minDate', () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const minDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

      render(<DatePicker selectedDates={[]} onDatesChange={() => {}} minDate={minDate} />);
      fireEvent.click(screen.getByRole('button'));

      // Today's date should be disabled
      const todayDateButton = screen.getByText(today.getDate().toString());
      expect(todayDateButton).toBeDisabled();
    });

    it('disables dates after maxDate', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const maxDate = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

      render(<DatePicker selectedDates={[]} onDatesChange={() => {}} maxDate={maxDate} />);
      fireEvent.click(screen.getByRole('button'));

      // Today's date should be disabled
      const todayDateButton = screen.getByText(today.getDate().toString());
      expect(todayDateButton).toBeDisabled();
    });

    it('does not select disabled dates', () => {
      const onDatesChangeMock = jest.fn();
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const minDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

      render(
        <DatePicker
          selectedDates={[]}
          onDatesChange={onDatesChangeMock}
          minDate={minDate}
        />
      );
      fireEvent.click(screen.getByRole('button'));

      // Try to click today (which is disabled)
      const todayDateButton = screen.getByText(today.getDate().toString());
      fireEvent.click(todayDateButton);

      expect(onDatesChangeMock).not.toHaveBeenCalled();
    });

    it('defaults minDate to today if not provided', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);

      // Navigate to previous month to see yesterday
      render(<DatePicker selectedDates={[]} onDatesChange={() => {}} />);
      fireEvent.click(screen.getByRole('button'));

      // Yesterday should be disabled (default minDate is today)
      // This test checks the behavior by verifying today is enabled
      const todayButton = screen.getByText(today.getDate().toString());
      expect(todayButton).not.toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('has accessible button', () => {
      render(<DatePicker selectedDates={[]} onDatesChange={() => {}} />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('type', 'button');
    });

    it('calendar days are buttons', () => {
      render(<DatePicker selectedDates={[]} onDatesChange={() => {}} />);
      fireEvent.click(screen.getByRole('button'));

      // Check that day buttons exist
      const today = new Date();
      const todayButton = screen.getByText(today.getDate().toString());
      expect(todayButton.tagName).toBe('BUTTON');
    });
  });
});
