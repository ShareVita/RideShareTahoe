import { render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { supabase } from '@/libs/supabase';
// Import the hook so we can cast the mock
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import MessagesPage from './page';

// Mocks
jest.mock('@/hooks/useProtectedRoute', () => ({
  useProtectedRoute: jest.fn(),
}));

jest.mock('@/libs/validation', () => ({
  validateUUID: jest.fn((uuid: string, fieldName: string) => {
    // Mock implementation that validates UUIDs like the real function
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(uuid)) {
      throw new Error(`${fieldName} must be a valid UUID`);
    }
    return true;
  }),
}));

jest.mock('@/libs/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        or: jest.fn(() => ({
          order: jest.fn(),
        })),
        limit: jest.fn(), // Keep for old test compatibility, though new code uses .or().order()
      })),
    })),
    channel: jest.fn(() => ({
      on: jest.fn(() => ({
        subscribe: jest.fn(() => ({
          unsubscribe: jest.fn(),
        })),
      })),
    })),
    removeChannel: jest.fn(),
  },
}));

type MockUpdateResult = { error: null };
type MockUpdateChain = Promise<MockUpdateResult> & {
  eq: jest.Mock<MockUpdateChain, []>;
};

const createUpdateChain = (): MockUpdateChain => {
  const updateResult = Promise.resolve<MockUpdateResult>({ error: null }) as MockUpdateChain;
  updateResult.eq = jest.fn(() => updateResult);
  return updateResult;
};

// Cast the mocked hooks
const mockedUseProtectedRoute = useProtectedRoute as jest.Mock;
const mockedFrom = supabase.from as jest.Mock;

describe('MessagesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset the mock chain implementation before each test
    // This default mock handles the .or().order() chain
    const mockOrderImpl = jest.fn().mockResolvedValue({ data: [], error: null });
    const mockEqImpl = jest.fn().mockReturnValue({ order: mockOrderImpl });
    const mockOrImpl = jest.fn().mockReturnValue({ order: mockOrderImpl, eq: mockEqImpl });
    const mockSelectImpl = jest.fn().mockReturnValue({
      or: mockOrImpl,
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
    });
    mockedFrom.mockReturnValue({
      select: mockSelectImpl,
      update: jest.fn(() => createUpdateChain()),
    });

    // Default to an authenticated user, as this is the component's primary state
    mockedUseProtectedRoute.mockReturnValue({
      user: { id: '00000000-0000-4000-8000-000000000099' },
      isLoading: false,
    });
  });

  it('shows the main loading spinner while authenticating', () => {
    // Override default auth mock for this test
    mockedUseProtectedRoute.mockReturnValue({
      user: null,
      isLoading: true, // This maps to `authLoading` in the component
    });

    render(<MessagesPage />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    const spinner = screen.getByText('Loading...').previousElementSibling;
    expect(spinner).toHaveClass('animate-spin');
  });

  /*
   * NOTE: The test 'shows "Please sign in" message' has been removed.
   * The new implementation uses `useProtectedRoute`, which handles
   * redirection if the user is not authenticated. The component
   * itself no longer renders a "Please sign in" state.
   */

  it('shows "No conversations yet" when logged in but fetch returns empty', async () => {
    // Set up the specific user for this test
    mockedUseProtectedRoute.mockReturnValue({
      user: { id: '00000000-0000-4000-8000-000000000003' },
      isLoading: false,
    });

    // The default `mockOrderImpl` from beforeEach already returns { data: [] }
    // so no need to re-mock `supabase.from`

    render(<MessagesPage />);

    expect(screen.getByRole('heading', { name: /conversations/i })).toBeInTheDocument();

    // Wait for the "No conversations yet" message to appear after loading
    await waitFor(() => {
      expect(screen.getByText('No conversations yet')).toBeInTheDocument();
    });

    // The right pane should show the placeholder
    expect(screen.getByRole('heading', { name: /select a conversation/i })).toBeInTheDocument();
  });

  it('fetches and displays conversations, then loads messages for the first one', async () => {
    const mockUser = { id: '00000000-0000-4000-8000-000000000001', email: 'user@test.com' };
    const mockConversations = [
      {
        id: 'convo-1',
        participant1_id: '00000000-0000-4000-8000-000000000001',
        participant2_id: '00000000-0000-4000-8000-000000000002',
        participant1: {
          id: '00000000-0000-4000-8000-000000000001',
          first_name: 'Test',
          last_name: 'User',
          profile_photo_url: 'test.png',
        },
        participant2: {
          id: '00000000-0000-4000-8000-000000000002',
          first_name: 'Jane',
          last_name: 'Doe',
          profile_photo_url: 'jane.png',
        },
        ride: {
          id: 'ride-1',
          title: 'Needs a Dog Sitter',
          start_location: 'A',
          end_location: 'B',
          departure_date: '2023-10-27',
        },
        last_message_at: new Date().toISOString(),
      },
    ];
    const mockMessages = [
      {
        id: 'msg-1',
        sender_id: '00000000-0000-4000-8000-000000000002',
        recipient_id: '00000000-0000-4000-8000-000000000001',
        content: 'Hello there!',
        created_at: '2023-10-27T10:00:00Z',
      },
      {
        id: 'msg-2',
        sender_id: '00000000-0000-4000-8000-000000000001',
        recipient_id: '00000000-0000-4000-8000-000000000002',
        content: 'Hi!',
        created_at: '2023-10-27T10:01:00Z',
      },
    ];

    const mockBookingRequests = [
      {
        id: 'booking-1',
        ride_id: 'ride-1',
        driver_id: mockUser.id,
        passenger_id: '00000000-0000-4000-8000-000000000002',
        status: 'pending',
        pickup_location: 'Downtown',
        pickup_time: '2025-12-01T10:00:00Z',
        driver: { first_name: 'Test', last_name: 'User' },
        passenger: { first_name: 'Jane', last_name: 'Doe' },
      },
    ];

    // Set up the authenticated user
    mockedUseProtectedRoute.mockReturnValue({
      user: mockUser,
      isLoading: false,
    });

    // Mock for 'conversations' table: select().or().order()
    const convoOrder = jest.fn().mockResolvedValue({ data: mockConversations, error: null });
    const convoOr = jest.fn().mockReturnValue({ order: convoOrder });
    const convoSelect = jest.fn().mockReturnValue({ or: convoOr });

    // Mock for 'messages' table: select().or().eq().order()
    const msgOrder = jest.fn().mockResolvedValue({ data: mockMessages, error: null });
    const msgEq = jest.fn().mockReturnValue({ order: msgOrder });
    const msgOr = jest.fn().mockReturnValue({ eq: msgEq });
    const msgSelect = jest.fn().mockReturnValue({ or: msgOr });

    const bookingOrder = jest.fn().mockResolvedValue({ data: mockBookingRequests, error: null });
    const bookingEq = jest.fn().mockReturnValue({ order: bookingOrder });
    const bookingIs = jest.fn().mockReturnValue({ order: bookingOrder });
    const bookingIn = jest.fn().mockReturnValue({ eq: bookingEq, is: bookingIs });
    const bookingOr = jest.fn().mockReturnValue({ in: bookingIn });
    const bookingSelect = jest.fn().mockReturnValue({ or: bookingOr });

    mockedFrom.mockImplementation((tableName: string) => {
      if (tableName === 'conversations') {
        return { select: convoSelect, update: jest.fn(() => createUpdateChain()) };
      }
      if (tableName === 'messages') {
        return { select: msgSelect, update: jest.fn(() => createUpdateChain()) };
      }
      if (tableName === 'trip_bookings') {
        return { select: bookingSelect };
      }
      return { select: jest.fn(), update: jest.fn(() => createUpdateChain()) };
    });

    render(<MessagesPage />);

    await waitFor(() => {
      expect(bookingOrder).toHaveBeenCalled();
    });

    // --- 1. Check Sidebar ---
    const sidebar = screen.getByRole('heading', { name: /conversations/i }).closest('aside');
    expect(sidebar).toBeInTheDocument();

    await waitFor(() => {
      if (sidebar) {
        // Find the conversation item
        expect(within(sidebar).getByRole('heading', { name: 'Jane Doe' })).toBeInTheDocument();
        expect(within(sidebar).getByText('Needs a Dog Sitter')).toBeInTheDocument();
      }
    });

    // --- 2. Check Main Thread ---
    // Wait for the message input to appear, confirming a conversation is selected and messaging is enabled
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/type your message/i)).toBeInTheDocument();
    });

    const mainContent = screen.getByPlaceholderText(/type your message/i).closest('section');
    expect(mainContent).toBeInTheDocument();

    await waitFor(() => {
      if (!mainContent) {
        throw new Error('Main content should be rendered');
      }
      // Check header
      expect(within(mainContent).getByRole('heading', { name: 'Jane Doe' })).toBeInTheDocument();
      // Check messages
      expect(within(mainContent).getByText('Hello there!')).toBeInTheDocument();
      expect(within(mainContent).getByText('Hi!')).toBeInTheDocument();
    });

    expect(screen.getByText(/1 request/)).toBeInTheDocument();
    if (mainContent) {
      expect(within(mainContent).getByText(/Jane Doe\s*•/i)).toBeInTheDocument();
    }
    expect(screen.getByText(/pending/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Approve/i })).toBeInTheDocument();

    // --- 3. Check Message Styling ---
    // Find *your* message
    const userMessage = screen.getByText('Hi!').closest('.message-bubble');
    expect(userMessage).toHaveClass('bg-blue-600 text-white');

    // Find the *other participant's* message
    const otherMessage = screen.getByText('Hello there!').closest('.message-bubble');
    expect(otherMessage).toHaveClass('bg-white text-gray-900');
  });
});
