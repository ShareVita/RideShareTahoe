import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useUser } from '@/components/providers/SupabaseUserProvider';
import ProfilePage from './page';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
}));

jest.mock('@/components/providers/SupabaseUserProvider', () => ({
  useUser: jest.fn(),
}));

jest.mock('@/libs/utils', () => {
  const actualUtils = jest.requireActual('@/libs/utils');

  return {
    formatLocation: jest.fn((loc) => ({
      city: loc.city,
      state: loc.state,
    })),
    formatPronouns: actualUtils.formatPronouns,
  };
});

jest.mock(
  '../../components/DeleteAccountModal',
  () =>
    function MockDeleteModal() {
      return <div data-testid="delete-modal" />;
    }
);
jest.mock(
  '../../components/DeletionRequestStatus',
  () =>
    function MockDeletionStatus() {
      return <div data-testid="deletion-status" />;
    }
);
jest.mock(
  '../../components/UserReviews',
  () =>
    function MockUserReviews() {
      return <div data-testid="user-reviews" />;
    }
);

jest.spyOn(console, 'error').mockImplementation(() => {});

const mockFetch = jest.fn();

const baseProfile = {
  id: 'user-123',
  first_name: 'John',
  last_name: 'Doe',
  role: 'pet_owner',
  profile_photo_url: 'https://example.com/photo.png',
  bio: 'This is my bio.',
  city: 'My City',
  state: 'TX',
  support_preferences: ['sick_recovering', 'other'],
  support_story: 'This is my support story.',
  facebook_url: 'https://facebook.com/john',
  instagram_url: 'https://instagram.com/john',
  pronouns: 'he/him',
};

const baseSocials = {
  user_id: 'user-123',
  facebook_url: 'https://facebook.com/john',
  instagram_url: 'https://instagram.com/john',
};

const createMockFetchResponse = (status: number, body?: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  json: jest.fn().mockResolvedValue(body),
});

const mockedUseUser = useUser as jest.Mock<ReturnType<typeof useUser>, Parameters<typeof useUser>>;

describe('ProfilePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis as unknown as { fetch: jest.Mock }).fetch = mockFetch;
    mockFetch.mockResolvedValue(createMockFetchResponse(200, { profile: null, socials: null }));
    // Default to a loading state
    mockedUseUser.mockReturnValue({
      user: null,
      loading: true,
      session: null,
      signOut: jest.fn().mockResolvedValue({ error: null }),
    });
  });

  const renderProfileWithOverrides = async (
    overrides: Partial<typeof baseProfile>,
    expectedHeading: string
  ) => {
    const profile = { ...baseProfile, ...overrides };
    mockFetch.mockResolvedValueOnce(
      createMockFetchResponse(200, { profile, socials: baseSocials })
    );
    render(<ProfilePage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: expectedHeading })).toBeInTheDocument();
    });
    return profile;
  };

  it('shows the loading spinner while user is loading', () => {
    render(<ProfilePage />);
    expect(screen.getByText('Loading your profile...')).toBeInTheDocument();
  });

  it('shows an error message if there is no user session', async () => {
    mockedUseUser.mockReturnValue({
      user: null,
      loading: false,
      session: null,
      signOut: jest.fn().mockResolvedValue({ error: null }),
    });
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Error Loading Profile' })).toBeInTheDocument();
      expect(screen.getByText('No session')).toBeInTheDocument();
    });
  });

  it('shows "Profile Not Found" if user exists but profile is null', async () => {
    mockedUseUser.mockReturnValue({
      user: {
        id: 'user-123',
        app_metadata: ['app'],
        user_metadata: ['user'],
        aud: 'aud',
        created_at: '',
      },
      loading: false,
      session: null,
      signOut: jest.fn().mockResolvedValue({ error: null }),
    });
    mockFetch.mockResolvedValueOnce(createMockFetchResponse(404));
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Profile Not Found' })).toBeInTheDocument();
    });
    expect(screen.getByText('Please complete your profile setup.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create Your Profile' })).toHaveAttribute(
      'href',
      '/profile/edit'
    );
  });

  it('shows a generic error message if profile fetch fails', async () => {
    mockedUseUser.mockReturnValue({
      user: {
        id: 'user-123',
        app_metadata: ['app'],
        user_metadata: ['user'],
        aud: 'aud',
        created_at: '',
      },
      loading: false,
      session: null,
      signOut: jest.fn().mockResolvedValue({ error: null }),
    });
    mockFetch.mockResolvedValueOnce(createMockFetchResponse(500, { message: 'DB down' }));
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Error Loading Profile' })).toBeInTheDocument();
      expect(screen.getByText('Failed to load profile')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
  });

  it('renders the full profile when user and data are loaded', async () => {
    mockedUseUser.mockReturnValue({
      user: {
        id: 'user-123',
        app_metadata: ['app'],
        user_metadata: ['user'],
        aud: 'aud',
        created_at: '',
      },
      loading: false,
      session: null,
      signOut: jest.fn().mockResolvedValue({ error: null }),
    });
    await renderProfileWithOverrides({}, 'John Doe (He/Him)');

    expect(screen.getByAltText('Profile')).toHaveAttribute('src', 'https://example.com/photo.png');
    expect(screen.getByText('This is my bio.')).toBeInTheDocument();

    expect(screen.getByText('📍 My City, TX')).toBeInTheDocument();

    expect(screen.getByRole('link', { name: '📘 Facebook' })).toHaveAttribute(
      'href',
      baseSocials.facebook_url
    );
    expect(screen.getByRole('link', { name: '📷 Instagram' })).toHaveAttribute(
      'href',
      baseSocials.instagram_url
    );
    expect(screen.queryByRole('link', { name: '💼 LinkedIn' })).not.toBeInTheDocument();

    expect(screen.getByTestId('deletion-status')).toBeInTheDocument();
    expect(screen.getByTestId('user-reviews')).toBeInTheDocument();
    expect(screen.getByTestId('delete-modal')).toBeInTheDocument();
  });

  const pronounCases = [
    { pronouns: 'he/him', heading: 'John Doe (He/Him)' },
    { pronouns: 'she/her', heading: 'John Doe (She/Her)' },
    { pronouns: 'they/them', heading: 'John Doe (They/Them)' },
  ] as const;

  it.each(pronounCases)('shows %s beside the name', async ({ pronouns, heading }) => {
    mockedUseUser.mockReturnValue({
      user: {
        id: 'user-123',
        app_metadata: ['app'],
        user_metadata: ['user'],
        aud: 'aud',
        created_at: '',
      },
      loading: false,
      session: null,
      signOut: jest.fn().mockResolvedValue({ error: null }),
    });

    await renderProfileWithOverrides({ pronouns }, heading);
  });

  it('does not render pronouns when prefer not to answer is selected', async () => {
    mockedUseUser.mockReturnValue({
      user: {
        id: 'user-123',
        app_metadata: ['app'],
        user_metadata: ['user'],
        aud: 'aud',
        created_at: '',
      },
      loading: false,
      session: null,
      signOut: jest.fn().mockResolvedValue({ error: null }),
    });

    await renderProfileWithOverrides({ pronouns: 'prefer not to answer' }, 'John Doe');
    const heading = screen.getByRole('heading', { name: 'John Doe' });
    expect(heading).not.toHaveTextContent('(');
  });
});
