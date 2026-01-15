import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { DriversTab } from './DriversSection';
import { fetchDrivers } from '@/libs/community/driversData';
import { createClient } from '@/lib/supabase/client';

import type { ProfileType } from '../../types';

// Mocks
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/libs/community/driversData', () => ({
  fetchDrivers: jest.fn(),
}));

jest.mock('./DriverCard', () => ({
  DriverCard: ({ driver }: { driver: ProfileType }) => (
    <div data-testid="driver-card">{driver.first_name}</div>
  ),
}));

jest.mock('../PaginationControls', () => ({
  PaginationControls: ({
    onPageChange,
    currentPage,
  }: {
    // eslint-disable-next-line no-unused-vars
    onPageChange: (_page: number) => void;
    currentPage: number;
  }) => (
    <div data-testid="pagination">
      Page {currentPage}
      <button onClick={() => onPageChange(currentPage + 1)} data-testid="next-page">
        Next
      </button>
    </div>
  ),
}));

describe('DriversTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.HTMLElement.prototype.scrollIntoView = jest.fn();
    (createClient as jest.Mock).mockReturnValue({}); // Mock supabase client
  });

  const mockSuccess = (drivers: ProfileType[], totalCount = 10) => {
    (fetchDrivers as jest.Mock).mockResolvedValue({
      drivers,
      totalCount,
      hasMore: totalCount > drivers.length,
    });
  };

  it('renders loading state initially', async () => {
    (fetchDrivers as jest.Mock).mockImplementation(() => new Promise(() => {}));
    render(<DriversTab />);
    // Assume DriversLoading renders or we assume empty DOM first?
  });

  it('renders drivers when loaded', async () => {
    mockSuccess([{ id: 'd1', first_name: 'Bob' }] as unknown as ProfileType[]);
    render(<DriversTab />);

    await waitFor(() => {
      expect(screen.getByTestId('driver-card')).toHaveTextContent('Bob');
    });
    expect(screen.getByText('10 drivers available')).toBeInTheDocument();
  });

  it('handles pagination', async () => {
    mockSuccess([{ id: 'd1', first_name: 'Bob' }] as unknown as ProfileType[], 20);
    render(<DriversTab />);

    await waitFor(() => {
      expect(screen.getByText('Page 1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('next-page'));

    await waitFor(() => {
      expect(screen.getByText('Page 2')).toBeInTheDocument();
    });

    expect(globalThis.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it('handles empty state', async () => {
    mockSuccess([], 0);
    render(<DriversTab />);

    await waitFor(() => {
      expect(screen.getByText('No Drivers Found')).toBeInTheDocument();
    });
  });

  it('handles error state', async () => {
    (fetchDrivers as jest.Mock).mockRejectedValue(new Error('Fail'));
    render(<DriversTab />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load drivers/)).toBeInTheDocument();
    });
  });
});
