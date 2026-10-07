import { render, screen } from '@testing-library/react';
import DeletionRequestStatus from './DeletionRequestStatus';

describe('Deletion request status and cancellation availability', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it.each(['pending', 'processing'] as const)('describes the %s state honestly', async (status) => {
    global.fetch = jest.fn().mockResolvedValue({
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
    render(<DeletionRequestStatus userId="member" />);
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
