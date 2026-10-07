import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DeletionRequestStatus from './DeletionRequestStatus';

// Mock fetch
globalThis.fetch = jest.fn();
globalThis.confirm = jest.fn();

describe('DeletionRequestStatus', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (globalThis.fetch as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves
    render(<DeletionRequestStatus userId={mockUserId} />);
    // Check for pulse animation class or structure
    const pulseElement = document.querySelector('.animate-pulse');
    expect(pulseElement).toBeInTheDocument();
  });

  it('renders nothing if no pending request', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ hasPendingRequest: false }),
    });

    const { container } = render(<DeletionRequestStatus userId={mockUserId} />);

    await waitFor(() => {
      expect(container).toBeEmptyDOMElement();
    });
  });

  it('renders status if pending request exists', async () => {
    const mockRequest = {
      status: 'pending',
      daysRemaining: 10,
      scheduled_deletion_date: '2023-12-31',
      reason: 'Test reason',
    };
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ hasPendingRequest: true, deletionRequest: mockRequest }),
    });

    render(<DeletionRequestStatus userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText('⚠️ Account Deletion Scheduled')).toBeInTheDocument();
      expect(screen.getByText('10 days')).toBeInTheDocument();
      expect(screen.getByText('Test reason')).toBeInTheDocument();
    });
  });

  it('shows very urgent style when days remaining <= 3', async () => {
    const mockRequest = {
      status: 'pending',
      daysRemaining: 2,
      scheduled_deletion_date: '2023-12-31',
    };
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ hasPendingRequest: true, deletionRequest: mockRequest }),
    });

    render(<DeletionRequestStatus userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText(/Your account will be deleted very soon/i)).toBeInTheDocument();
    });
  });

  it('handles cancellation', async () => {
    const mockRequest = {
      status: 'pending',
      daysRemaining: 10,
      scheduled_deletion_date: '2023-12-31',
    };
    (globalThis.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ hasPendingRequest: true, deletionRequest: mockRequest }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    (globalThis.confirm as jest.Mock).mockReturnValue(true);

    render(<DeletionRequestStatus userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText('Cancel Deletion')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Cancel Deletion'));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/account/deletion-request', {
        method: 'DELETE',
      });
      expect(screen.queryByText('⚠️ Account Deletion Scheduled')).not.toBeInTheDocument();
    });
  });

  it('handles error state', async () => {
    (globalThis.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<DeletionRequestStatus userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText(/Error loading deletion status: Network error/i)).toBeInTheDocument();
    });
  });

  it.each(['pending', 'processing'] as const)('describes the %s state honestly', async (status) => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        hasPendingRequest: true,
        deletionRequest: {
          status,
          daysRemaining: 0,
          scheduled_deletion_date: '2026-10-07T12:00:00Z',
        },
      }),
    });
    render(<DeletionRequestStatus userId={mockUserId} />);
    const button = await screen.findByRole('button', {
      name: status === 'pending' ? 'Cancel Deletion' : 'Deletion in progress',
    });
    expect(screen.getByText(/Deleted account data cannot be recovered/)).toBeInTheDocument();
    expect(screen.queryByText(/same email address/)).not.toBeInTheDocument();
    if (status === 'processing') {
      expect(button).toBeDisabled();
      expect(screen.queryByText(/cancel the deletion request now/)).not.toBeInTheDocument();
    } else {
      expect(button).toBeEnabled();
      expect(screen.getByText(/cancel the deletion request now/)).toBeInTheDocument();
    }
  });
});
