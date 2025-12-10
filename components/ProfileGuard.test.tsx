import { fireEvent, render, screen } from '@testing-library/react';
import ProfileGuard from './ProfileGuard';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/components/providers/SupabaseUserProvider';
import { useUserProfile } from '@/hooks/useProfile';
import { toast } from 'react-hot-toast';

// Mock dependencies
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
  useRouter: jest.fn(),
}));

jest.mock('@/components/providers/SupabaseUserProvider', () => ({
  useUser: jest.fn(),
}));

jest.mock('@/hooks/useProfile', () => ({
  useUserProfile: jest.fn(),
}));

jest.mock('react-hot-toast', () => ({
  toast: jest.fn(),
}));

describe('ProfileGuard', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (toast as unknown as jest.Mock).mockReset();
  });

  it('renders children', () => {
    (useUser as jest.Mock).mockReturnValue({ user: null, loading: false });
    (useUserProfile as jest.Mock).mockReturnValue({ data: null, isLoading: false });
    (usePathname as jest.Mock).mockReturnValue('/');

    render(
      <ProfileGuard>
        <div>Child Content</div>
      </ProfileGuard>
    );

    expect(screen.getByText('Child Content')).toBeInTheDocument();
  });

  it('does nothing if loading', () => {
    (useUser as jest.Mock).mockReturnValue({ user: { id: '1' }, loading: true });
    (useUserProfile as jest.Mock).mockReturnValue({ data: null, isLoading: false });
    (usePathname as jest.Mock).mockReturnValue('/dashboard');

    render(
      <ProfileGuard>
        <div>Child Content</div>
      </ProfileGuard>
    );

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('does nothing if user is not logged in', () => {
    (useUser as jest.Mock).mockReturnValue({ user: null, loading: false });
    (useUserProfile as jest.Mock).mockReturnValue({ data: null, isLoading: false });
    (usePathname as jest.Mock).mockReturnValue('/dashboard');

    render(
      <ProfileGuard>
        <div>Child Content</div>
      </ProfileGuard>
    );

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('does nothing if on public path', () => {
    (useUser as jest.Mock).mockReturnValue({ user: { id: '1' }, loading: false });
    (useUserProfile as jest.Mock).mockReturnValue({ data: null, isLoading: false });
    (usePathname as jest.Mock).mockReturnValue('/login');

    render(
      <ProfileGuard>
        <div>Child Content</div>
      </ProfileGuard>
    );

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('does nothing if on setup path', () => {
    (useUser as jest.Mock).mockReturnValue({ user: { id: '1' }, loading: false });
    (useUserProfile as jest.Mock).mockReturnValue({ data: null, isLoading: false });
    (usePathname as jest.Mock).mockReturnValue('/complete-profile');

    render(
      <ProfileGuard>
        <div>Child Content</div>
      </ProfileGuard>
    );

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('shows the modal when logged in, not on public/setup path, and profile is missing', async () => {
    (useUser as jest.Mock).mockReturnValue({ user: { id: '1' }, loading: false });
    (useUserProfile as jest.Mock).mockReturnValue({ data: null, isLoading: false });
    (usePathname as jest.Mock).mockReturnValue('/dashboard');

    render(
      <ProfileGuard>
        <div>Child Content</div>
      </ProfileGuard>
    );

    expect(await screen.findByText('Complete your profile')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('shows the modal when logged in, not on public/setup path, and profile is incomplete', async () => {
    (useUser as jest.Mock).mockReturnValue({ user: { id: '1' }, loading: false });
    (useUserProfile as jest.Mock).mockReturnValue({ data: { first_name: '' }, isLoading: false });
    (usePathname as jest.Mock).mockReturnValue('/dashboard');

    render(
      <ProfileGuard>
        <div>Child Content</div>
      </ProfileGuard>
    );

    expect(await screen.findByText('Complete your profile')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('allows accessing /community without showing the modal', () => {
    (useUser as jest.Mock).mockReturnValue({ user: { id: '2' }, loading: false });
    (useUserProfile as jest.Mock).mockReturnValue({ data: null, isLoading: false });
    (usePathname as jest.Mock).mockReturnValue('/community');

    render(
      <ProfileGuard>
        <div>Community Section</div>
      </ProfileGuard>
    );

    expect(screen.getByText('Community Section')).toBeInTheDocument();
    expect(screen.queryByText('Complete your profile')).not.toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('navigates to /complete-profile when the modal confirmation is clicked', async () => {
    (useUser as jest.Mock).mockReturnValue({ user: { id: '1' }, loading: false });
    (useUserProfile as jest.Mock).mockReturnValue({ data: null, isLoading: false });
    (usePathname as jest.Mock).mockReturnValue('/dashboard');

    render(
      <ProfileGuard>
        <div>Child Content</div>
      </ProfileGuard>
    );

    const updateButton = await screen.findByRole('button', { name: /Update profile/i });

    fireEvent.click(updateButton);

    expect(mockPush).toHaveBeenCalledWith('/complete-profile');
    expect(toast).toHaveBeenCalledWith(
      'Please finish your profile before accessing protected areas.'
    );
  });

  it('navigates home when the modal is dismissed', async () => {
    (useUser as jest.Mock).mockReturnValue({ user: { id: '1' }, loading: false });
    (useUserProfile as jest.Mock).mockReturnValue({ data: null, isLoading: false });
    (usePathname as jest.Mock).mockReturnValue('/dashboard');

    render(
      <ProfileGuard>
        <div>Child Content</div>
      </ProfileGuard>
    );

    const maybeLater = await screen.findByRole('button', { name: /Maybe later/i });

    fireEvent.click(maybeLater);

    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('does not redirect if profile is complete', () => {
    (useUser as jest.Mock).mockReturnValue({ user: { id: '1' }, loading: false });
    (useUserProfile as jest.Mock).mockReturnValue({
      data: { first_name: 'John' },
      isLoading: false,
    });
    (usePathname as jest.Mock).mockReturnValue('/dashboard');

    render(
      <ProfileGuard>
        <div>Child Content</div>
      </ProfileGuard>
    );

    expect(mockPush).not.toHaveBeenCalled();
  });
});
