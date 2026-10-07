import { render, screen } from '@testing-library/react';
import ClientLayout from './LayoutClient';
import { Crisp } from 'crisp-sdk-web';
import { usePathname } from 'next/navigation';
import { useUser } from '@/components/providers/SupabaseUserProvider';

// Mock dependencies
jest.mock('crisp-sdk-web', () => ({
  Crisp: {
    configure: jest.fn(),
    chat: {
      hide: jest.fn(),
      onChatClosed: jest.fn(),
    },
    session: {
      setData: jest.fn(),
    },
    user: {
      setEmail: jest.fn(),
      setNickname: jest.fn(),
      setAvatar: jest.fn(),
    },
  },
}));

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

jest.mock('nextjs-toploader', () => {
  const MockTopLoader = () => <div data-testid="top-loader" />;
  MockTopLoader.displayName = 'MockTopLoader';
  return MockTopLoader;
});

jest.mock('react-hot-toast', () => {
  const MockToaster = () => <div data-testid="toaster" />;
  MockToaster.displayName = 'MockToaster';
  return {
    Toaster: MockToaster,
  };
});

jest.mock('react-tooltip', () => {
  const MockTooltip = () => <div data-testid="tooltip" />;
  MockTooltip.displayName = 'MockTooltip';
  return {
    Tooltip: MockTooltip,
  };
});

jest.mock('@/components/providers/SupabaseUserProvider', () => ({
  useUser: jest.fn(),
}));

jest.mock('@/config', () => ({
  crisp: {
    id: 'mock-crisp-id',
    onlyShowOnRoutes: ['/'],
  },
}));

describe('LayoutClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useUser as jest.Mock).mockReturnValue({ user: null });
    (usePathname as jest.Mock).mockReturnValue('/');
  });

  it('renders children and global components', () => {
    render(
      <ClientLayout>
        <div>Child Content</div>
      </ClientLayout>
    );

    expect(screen.getByText('Child Content')).toBeInTheDocument();
    expect(screen.getByTestId('top-loader')).toBeInTheDocument();
    expect(screen.getByTestId('toaster')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
  });

  it('initializes Crisp if configured', () => {
    render(
      <ClientLayout>
        <div />
      </ClientLayout>
    );

    expect(Crisp.configure).toHaveBeenCalledWith('mock-crisp-id');
  });

  it('does not load customer tracking on the token-bearing unsubscribe page', () => {
    (usePathname as jest.Mock).mockReturnValue('/unsubscribe');
    render(
      <ClientLayout>
        <div>Email preferences</div>
      </ClientLayout>
    );
    expect(Crisp.configure).not.toHaveBeenCalled();
  });

  it('sets Crisp user data if user is logged in', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      user_metadata: {
        full_name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
      },
    };
    (useUser as jest.Mock).mockReturnValue({ user: mockUser });

    render(
      <ClientLayout>
        <div />
      </ClientLayout>
    );

    expect(Crisp.session.setData).toHaveBeenCalledWith({ userId: 'user-123' });
    expect(Crisp.user.setEmail).toHaveBeenCalledWith('test@example.com');
    expect(Crisp.user.setNickname).toHaveBeenCalledWith('Test User');
    expect(Crisp.user.setAvatar).toHaveBeenCalledWith('https://example.com/avatar.jpg');
  });

  it('hides Crisp on non-allowed routes', () => {
    (usePathname as jest.Mock).mockReturnValue('/other-route');

    render(
      <ClientLayout>
        <div />
      </ClientLayout>
    );

    expect(Crisp.chat.hide).toHaveBeenCalled();
  });

  it('does not hide Crisp on allowed routes', () => {
    (usePathname as jest.Mock).mockReturnValue('/');

    render(
      <ClientLayout>
        <div />
      </ClientLayout>
    );

    expect(Crisp.chat.hide).not.toHaveBeenCalled();
  });
});
