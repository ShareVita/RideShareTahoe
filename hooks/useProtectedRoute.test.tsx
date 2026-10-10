import { renderHook, waitFor } from '@testing-library/react';
import type { User } from '@supabase/supabase-js';
import { useProtectedRoute } from './useProtectedRoute';
import { useUser } from '@/components/providers/SupabaseUserProvider';
import config from '@/config';

jest.mock('@/components/providers/SupabaseUserProvider', () => ({
  useUser: jest.fn(),
}));

const pushMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

const useUserMock = useUser as jest.MockedFunction<typeof useUser>;

describe('useProtectedRoute', () => {
  beforeEach(() => {
    pushMock.mockClear();
    useUserMock.mockReset();
    window.history.replaceState({}, '', '/rides/post?type=passenger');
  });

  it('keeps loading state while auth is resolving', () => {
    useUserMock.mockReturnValue({ user: null, session: null, signOut: jest.fn(), loading: true });

    const { result } = renderHook(() => useProtectedRoute());

    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(true);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('redirects to login when auth resolves without a user', async () => {
    useUserMock.mockReturnValue({ user: null, session: null, signOut: jest.fn(), loading: false });

    const { result } = renderHook(() => useProtectedRoute());

    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith(
        `${config.auth.loginUrl}?next=%2Frides%2Fpost%3Ftype%3Dpassenger`
      )
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.user).toBeNull();
  });

  it('does not redirect once a user is available', async () => {
    const mockUser = { id: 'user-id' } as unknown as User;
    useUserMock.mockReturnValue({
      user: mockUser,
      session: null,
      signOut: jest.fn(),
      loading: false,
    });

    const { result } = renderHook(() => useProtectedRoute());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toBe(mockUser);
    expect(pushMock).not.toHaveBeenCalled();
  });
});
