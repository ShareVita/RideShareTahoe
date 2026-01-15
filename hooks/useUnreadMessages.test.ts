import { renderHook, waitFor } from '@testing-library/react';
import { useUnreadMessages } from './useUnreadMessages';
import { useUser } from '@/components/providers/SupabaseUserProvider';
import { createClient } from '@/lib/supabase/client';

// Mock dependencies
jest.mock('@/components/providers/SupabaseUserProvider');
jest.mock('@/lib/supabase/client');

describe('useUnreadMessages', () => {
  const mockUseUser = useUser as jest.Mock;
  const mockCreateClient = createClient as jest.Mock;
  const mockSupabase = {
    from: jest.fn(),
    channel: jest.fn(),
    removeChannel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateClient.mockReturnValue(mockSupabase);

    // Default supabase chain mocks
    const mockSelect = jest.fn();
    const mockEq = jest.fn();

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      eq: mockEq,
    });
    mockEq.mockReturnValue({
      eq: jest.fn().mockResolvedValue({ count: 5, error: null }),
    });

    // Default channel mocks
    const mockOn = jest.fn();
    const mockSubscribe = jest.fn();

    mockSupabase.channel.mockReturnValue({
      on: mockOn,
    });
    mockOn.mockReturnValue({
      subscribe: mockSubscribe,
    });
    mockSubscribe.mockReturnValue({});
  });

  it('should return 0 unread count if user is not logged in', async () => {
    mockUseUser.mockReturnValue({ user: null });

    const { result } = renderHook(() => useUnreadMessages());

    expect(result.current.unreadCount).toBe(0);
    expect(result.current.loading).toBe(false);
    expect(result.current.hasUnreadMessages).toBe(false);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('should fetch unread count when user is logged in', async () => {
    const mockUser = { id: 'user-123' };
    mockUseUser.mockReturnValue({ user: mockUser });

    // Setup success response
    const mockEq2 = jest.fn().mockResolvedValue({ count: 3, error: null });
    const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });
    mockSupabase.from.mockReturnValue({ select: mockSelect });

    const { result } = renderHook(() => useUnreadMessages());

    // Initially loading
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.unreadCount).toBe(3);
    expect(result.current.hasUnreadMessages).toBe(true);

    // Verify query construction
    expect(mockSupabase.from).toHaveBeenCalledWith('messages');
    expect(mockSelect).toHaveBeenCalledWith('*', { count: 'exact', head: true });
    expect(mockEq1).toHaveBeenCalledWith('recipient_id', 'user-123');
    expect(mockEq2).toHaveBeenCalledWith('is_read', false);
  });

  it('should handle errors gracefully', async () => {
    const mockUser = { id: 'user-123' };
    mockUseUser.mockReturnValue({ user: mockUser });

    // Setup error response
    const mockEq2 = jest.fn().mockResolvedValue({ count: null, error: new Error('Fetch failed') });
    const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });
    mockSupabase.from.mockReturnValue({ select: mockSelect });

    // Spy on console.error to silence it
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useUnreadMessages());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should default to 0 on error
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.hasUnreadMessages).toBe(false);

    consoleSpy.mockRestore();
  });

  it('should subscribe to realtime updates', async () => {
    const mockUser = { id: 'user-123' };
    mockUseUser.mockReturnValue({ user: mockUser });

    renderHook(() => useUnreadMessages());

    await waitFor(() => {
      expect(mockSupabase.channel).toHaveBeenCalledWith('unread-messages-count');
    });
  });
});
