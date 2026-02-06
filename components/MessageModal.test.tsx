import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import MessageModal from './MessageModal'; // Adjust path as needed

// #region Type Definitions
// Define types for props since they aren't exported from the .js file
interface Recipient {
  id: string;
  first_name: string;
}

interface RidePost {
  id: string;
}

interface MessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipient: Recipient | null;
  ridePost: RidePost | null;
}
// #endregion

// #region Mocks & Setup
// Mock globalThis.fetch
globalThis.fetch = jest.fn();

const mockOnClose = jest.fn();

const mockRecipient: Recipient = {
  id: 'recipient-uuid-123',
  first_name: 'Jane Doe',
};

const mockRidePost: RidePost = {
  id: 'ride-post-uuid-456',
};

const defaultProps: MessageModalProps = {
  isOpen: true,
  onClose: mockOnClose,
  recipient: mockRecipient,
  ridePost: null,
};

// Helper to render the component with default props
const renderComponent = (props: Partial<MessageModalProps> = {}) => {
  return render(<MessageModal {...defaultProps} {...props} />);
};
// #endregion

describe('MessageModal', () => {
  // Use fake timers to control setTimeout
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks(); // Clear mockOnClose, fetch, etc.

    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error

    // Default successful fetch mock
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    } as Response);
  });

  afterEach(() => {
    // Restore real timers
    jest.useRealTimers();
  });

  it('renders null when isOpen is false', () => {
    const { container } = renderComponent({ isOpen: false });
    expect(container.firstChild).toBeNull();
  });

  it('renders the modal when isOpen is true', () => {
    renderComponent();
    expect(screen.getByRole('heading', { name: /Send Message/i })).toBeInTheDocument();
  });

  it('displays recipient when no post is provided', () => {
    renderComponent({ ridePost: null });
    // Check for "To:" label and recipient name
    expect(screen.getByText(/To:/i)).toBeInTheDocument();
    expect(screen.getByText(/Jane Doe/i)).toBeInTheDocument();
  });

  it('displays recipient when a post is provided', () => {
    renderComponent({ ridePost: mockRidePost });
    expect(screen.getByText(/To:/i)).toHaveTextContent('To: Jane Doe');
  });

  it('calls onClose when the "Cancel" button is clicked', () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('updates message state on textarea change', () => {
    renderComponent();
    const textarea = screen.getByPlaceholderText(/Type your message here/i);
    fireEvent.change(textarea, { target: { value: 'Hello there' } });
    expect(textarea).toHaveValue('Hello there');
  });

  it('disables the submit button when the message is empty', () => {
    renderComponent();
    const submitButton = screen.getByRole('button', { name: /Send Message/i });
    expect(submitButton).toBeDisabled();
  });

  it('enables the submit button when the message is not empty', () => {
    renderComponent();
    const textarea = screen.getByPlaceholderText(/Type your message here/i);
    const submitButton = screen.getByRole('button', { name: /Send Message/i });

    fireEvent.change(textarea, { target: { value: ' ' } });
    expect(submitButton).toBeDisabled(); // Still disabled if only whitespace

    fireEvent.change(textarea, { target: { value: 'Not empty' } });
    expect(submitButton).not.toBeDisabled();
  });

  it('shows a validation error if submit is clicked with no message', async () => {
    renderComponent();
    // Manually enable button to simulate user bypassing "disabled"
    const submitButton = screen.getByRole('button', { name: /Send Message/i });
    fireEvent.change(screen.getByPlaceholderText(/Type your message here/i), {
      target: { value: ' ' },
    });

    fireEvent.submit(submitButton);

    expect(await screen.findByText('Please fill in all required fields')).toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('submits the form, shows success, and closes after 2 seconds', async () => {
    renderComponent();
    const textarea = screen.getByPlaceholderText(/Type your message here/i);
    const submitButton = screen.getByRole('button', { name: /Send Message/i });

    // 1. Fill form
    fireEvent.change(textarea, { target: { value: 'Test message' } });
    expect(submitButton).not.toBeDisabled();

    // 2. Submit form
    fireEvent.click(submitButton);

    // 3. Check loading state
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Sending.../i })).toBeDisabled();
    });

    // 4. Verify fetch call
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient_id: mockRecipient.id,
        ride_post_id: null,
        content: 'Test message',
      }),
    });

    // 5. Check for success message
    await waitFor(() => {
      expect(screen.getByText('Message sent successfully!')).toBeInTheDocument();
    });
    expect(textarea).toHaveValue(''); // Message is cleared

    // 6. Check that onClose has NOT been called yet
    expect(mockOnClose).not.toHaveBeenCalled();

    // 7. Advance timers by 2 seconds
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    // 8. Check that onClose has NOW been called
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('shows an error message if the fetch call fails', async () => {
    // Override default mock with a failed response
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Server exploded' }),
    } as Response);

    renderComponent();
    const textarea = screen.getByPlaceholderText(/Type your message here/i);
    const submitButton = screen.getByRole('button', { name: /Send Message/i });

    // 1. Fill and submit
    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.click(submitButton);

    // 2. Check for error message
    await waitFor(() => {
      expect(screen.getByText('Server exploded')).toBeInTheDocument();
    });

    // 3. Check that loading state is reset
    expect(screen.getByRole('button', { name: /Send Message/i })).not.toBeDisabled();
    expect(screen.queryByRole('button', { name: /Sending.../i })).not.toBeInTheDocument();

    // 4. Check that modal did not close
    expect(mockOnClose).not.toHaveBeenCalled();
    expect(screen.queryByText('Message sent successfully!')).not.toBeInTheDocument();
  });
});
