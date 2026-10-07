import React, { ReactNode, AnchorHTMLAttributes } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoggedInNav from './LoggedInNav';
import { useUser } from '@/components/providers/SupabaseUserProvider';
import { useSearchParams, usePathname } from 'next/navigation';
import config from '@/config';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

interface MockImageProps {
  src: string | { src: string };
  alt: string;
  [key: string]: string | number | undefined | null | object | ReactNode;
}

interface MockLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  // The href prop is what's critical here. Next.js Link accepts string or an object (Route).
  // For a mock, string is usually sufficient.
  href: string;
}

// 1. Mock Next.js and external dependencies
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
  usePathname: jest.fn(),
  useRouter: jest.fn(() => ({ replace: mockReplace, refresh: mockRefresh })),
}));

jest.mock('@/components/providers/SupabaseUserProvider', () => ({
  useUser: jest.fn(),
}));

jest.mock('@/hooks/useUnreadMessages', () => ({
  useUnreadMessages: jest.fn(),
}));

jest.mock('@/config', () => ({
  appName: 'RideShareTahoe',
}));

// Mock next/image
jest.mock(
  'next/image',
  () =>
    function Image({ src, alt, ...props }: MockImageProps) {
      const imageSrc = typeof src === 'string' ? src : src.src;
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={imageSrc} alt={alt} {...props} />;
    }
);

// Mock next/link
jest.mock(
  'next/link',
  () =>
    function Link({ href, children, ...props }: React.PropsWithChildren<MockLinkProps>) {
      return (
        // The HTMLAnchorElement now correctly expects string for href
        <a href={href} {...props}>
          {children}
        </a>
      );
    }
);

// 2. Type-safe mock variables
const mockedUsePathname = usePathname as jest.Mock;
const mockedUseSearchParams = useSearchParams as jest.Mock;
const mockedUseUser = useUser as jest.Mock;
const mockReplace = jest.fn();
const mockRefresh = jest.fn();
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
const mockedUseUnreadMessages = useUnreadMessages as jest.Mock;

describe('LoggedInNav', () => {
  let mockedSignOut: jest.Mock;
  let consoleErrorSpy: jest.SpyInstance;
  const queryClient = new QueryClient();

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
  };

  beforeEach(() => {
    mockedSignOut = jest.fn().mockResolvedValue({ error: null });
    mockedUseUser.mockReturnValue({ signOut: mockedSignOut });
    mockedUseUnreadMessages.mockReturnValue({
      unreadCount: 0,
      loading: false,
      hasUnreadMessages: false,
    });
    mockedUsePathname.mockReturnValue('/');
    mockedUseSearchParams.mockReturnValue(new URLSearchParams());

    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    queryClient.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy.mockRestore();
  });

  test('renders correctly and mobile menu is hidden', () => {
    renderWithProviders(<LoggedInNav />);

    expect(
      screen.getAllByRole('link', { name: /RideShareTahoe logo RideShareTahoe/i })[0]
    ).toBeInTheDocument();
    expect(screen.getAllByText(config.appName)[0]).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /Open main menu/i })).toBeInTheDocument();

    expect(
      screen.getByRole('button', { name: /Close menu/i }).closest('div.relative.z-50')
    ).toHaveClass('hidden');
  });

  test('opens and closes the mobile menu on click', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoggedInNav />);
    const mobileMenu = screen
      .getByRole('button', { name: /Close menu/i })
      .closest('div.relative.z-50');

    // --- Open Menu ---
    expect(mobileMenu).toHaveClass('hidden');

    await user.click(screen.getByRole('button', { name: /Open main menu/i }));

    await waitFor(() => {
      expect(mobileMenu).not.toHaveClass('hidden');
    });

    // --- Close Menu ---
    await user.click(screen.getByRole('button', { name: /Close menu/i }));

    await waitFor(() => {
      expect(mobileMenu).toHaveClass('hidden');
    });
  });

  test('closes mobile menu on route change', async () => {
    const user = userEvent.setup();
    const { rerender } = renderWithProviders(<LoggedInNav />);
    const mobileMenu = screen
      .getByRole('button', { name: /Close menu/i })
      .closest('div.relative.z-50');

    // Open the menu
    await user.click(screen.getByRole('button', { name: /Open main menu/i }));
    await waitFor(() => {
      expect(mobileMenu).not.toHaveClass('hidden');
    });

    // Simulate a navigation
    mockedUsePathname.mockReturnValue('/messages');
    rerender(
      <QueryClientProvider client={queryClient}>
        <LoggedInNav />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(mobileMenu).toHaveClass('hidden');
    });
  });

  test('highlights the active link based on pathname', () => {
    // Set pathname to '/profile'
    mockedUsePathname.mockReturnValue('/profile');
    renderWithProviders(<LoggedInNav />);

    const activeLinks = screen.getAllByRole('link', { name: 'Profile' });
    const inactiveLinks = screen.getAllByRole('link', { name: 'Messages' });

    expect(activeLinks[0]).toHaveClass('bg-white/10');
    expect(activeLinks[1]).toHaveClass('bg-white/10');

    expect(inactiveLinks[0]).not.toHaveClass('bg-white/10');
    expect(inactiveLinks[1]).not.toHaveClass('bg-white/20');
  });

  test('handles successful sign out and redirects', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoggedInNav />);

    const signOutButtons = screen.getAllByRole('button', { name: /Sign out/i });
    await user.click(signOutButtons[0]);

    await waitFor(() => {
      expect(mockedSignOut).toHaveBeenCalledTimes(1);
    });

    expect(mockReplace).toHaveBeenCalledWith('/');
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  test('handles successful sign out from mobile menu', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoggedInNav />);

    await user.click(screen.getByRole('button', { name: /Open main menu/i }));
    await screen.findByRole('button', { name: /Close menu/i });

    const signOutButtons = screen.getAllByRole('button', { name: /Sign out/i });
    await user.click(signOutButtons[1]);

    await waitFor(() => {
      expect(mockedSignOut).toHaveBeenCalledTimes(1);
    });
    expect(mockReplace).toHaveBeenCalledWith('/');
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  test('handles failed sign out and logs an error', async () => {
    const user = userEvent.setup();
    const mockError = new Error('Sign out failed');
    mockedSignOut.mockResolvedValue({ error: mockError });

    renderWithProviders(<LoggedInNav />);

    const signOutButtons = screen.getAllByRole('button', { name: /Sign out/i });
    await user.click(signOutButtons[0]);

    await waitFor(() => {
      expect(mockedSignOut).toHaveBeenCalledTimes(1);
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error signing out:', mockError);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  test('displays badge when there are unread messages', () => {
    mockedUseUnreadMessages.mockReturnValue({
      unreadCount: 5,
      loading: false,
      hasUnreadMessages: true,
    });
    renderWithProviders(<LoggedInNav />);

    const badges = screen.getAllByTestId('messages-unread-badge');
    expect(badges.length).toBeGreaterThan(0);
    for (const badge of badges) {
      expect(badge).toHaveTextContent('5');
    }
  });

  test('displays 99+ when unread messages exceed 99', () => {
    mockedUseUnreadMessages.mockReturnValue({
      unreadCount: 100,
      loading: false,
      hasUnreadMessages: true,
    });
    renderWithProviders(<LoggedInNav />);

    const badges = screen.getAllByTestId('messages-unread-badge');
    expect(badges.length).toBeGreaterThan(0);
    expect(badges[0]).toHaveTextContent('99+');
  });

  test('hides the badge when there are no unread messages', () => {
    renderWithProviders(<LoggedInNav />);
    expect(screen.queryByTestId('messages-unread-badge')).toBeNull();
  });
});
