import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BlockModal from './BlockModal';

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

import { toast } from 'react-hot-toast';

describe('BlockModal', () => {
  let user: ReturnType<typeof userEvent.setup>;
  const mockFetch = jest.fn();
  const originalFetch = globalThis.fetch;
  const mockOnClose = jest.fn();
  const mockOnBlockStateChanged = jest.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    targetUserId: 'user-123',
    targetUserName: 'John Doe',
    isCurrentlyBlocked: false,
    onBlockStateChanged: mockOnBlockStateChanged,
  };

  beforeAll(() => {
    globalThis.fetch = mockFetch;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  });

  // ## Visibility Tests

  it('should return null when isOpen is false', () => {
    const { container } = render(<BlockModal {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render block confirmation when isOpen is true and user is not blocked', () => {
    render(<BlockModal {...defaultProps} />);

    expect(screen.getByText('Block User?')).toBeInTheDocument();
    expect(screen.getByText(/will not be able to message you/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Block User' })).toBeInTheDocument();
  });

  it('should render unblock confirmation when user is already blocked', () => {
    render(<BlockModal {...defaultProps} isCurrentlyBlocked={true} />);

    expect(screen.getByText('Unblock User?')).toBeInTheDocument();
    expect(screen.getByText(/will be able to message/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unblock' })).toBeInTheDocument();
  });

  // ## Interaction Tests

  it('should close the modal when Cancel is clicked', async () => {
    render(<BlockModal {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call block API and callbacks on block confirmation', async () => {
    render(<BlockModal {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Block User' }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/users/block',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ blocked_id: 'user-123' }),
        })
      );
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('John Doe has been blocked');
      expect(mockOnBlockStateChanged).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should call unblock API on unblock confirmation', async () => {
    render(<BlockModal {...defaultProps} isCurrentlyBlocked={true} />);

    await user.click(screen.getByRole('button', { name: 'Unblock' }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/users/unblock',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ blocked_id: 'user-123' }),
        })
      );
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('John Doe has been unblocked');
    });
  });

  it('should disable buttons during submission', async () => {
    // eslint-disable-next-line no-unused-vars
    let resolvePromise: (value: unknown) => void = () => {};
    const fetchPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    mockFetch.mockImplementationOnce(() => fetchPromise);

    render(<BlockModal {...defaultProps} />);
    const blockButton = screen.getByRole('button', { name: 'Block User' });

    await user.click(blockButton);

    expect(screen.getByRole('button', { name: 'Processing...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();

    // Resolve the promise to prevent it from leaking into next test
    resolvePromise!({ ok: true, json: () => Promise.resolve({}) });
    await fetchPromise;
  });

  // ## Error Handling Tests

  it('should display error toast on API failure', async () => {
    // Use mockImplementation to ensure this mock applies consistently
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'User not found' }),
      })
    );

    render(<BlockModal {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Block User' }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('User not found');
    });

    // Modal should not close on error - wait to ensure no late callbacks
    await waitFor(() => {
      expect(mockOnBlockStateChanged).not.toHaveBeenCalled();
    });
  });

  it('should display generic error on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<BlockModal {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Block User' }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Network error');
    });
  });
});
