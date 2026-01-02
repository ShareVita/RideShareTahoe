import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import type { Session, User } from '@supabase/supabase-js';
import React from 'react';
import ProfileEditPage from './page';
import { useUser } from '@/components/providers/SupabaseUserProvider';
import {
  useUpdateProfile,
  useUserProfile,
  useUserConsents,
  type UpdateProfileOptions,
  type UserProfile,
} from '@/hooks/useProfile';

jest.mock('@/components/providers/SupabaseUserProvider', () => ({
  useUser: jest.fn(),
}));

jest.mock('@/hooks/useProfile', () => ({
  useUserProfile: jest.fn(),
  useUpdateProfile: jest.fn(),
  useUserConsents: jest.fn(),
}));

const pushMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: jest.fn(),
    prefetch: jest.fn().mockResolvedValue(undefined),
  }),
}));

const useUserMock = useUser as jest.MockedFunction<typeof useUser>;
const useUserProfileMock = useUserProfile as jest.MockedFunction<typeof useUserProfile>;
const useUpdateProfileMock = useUpdateProfile as jest.MockedFunction<typeof useUpdateProfile>;
const useUserConsentsMock = useUserConsents as jest.MockedFunction<typeof useUserConsents>;
const mutateMock = jest.fn();

const defaultProfile: UserProfile = {
  id: 'user-123',
  first_name: 'Jane',
  last_name: 'Doe',
  email: 'jane@example.com',
  avatar_url: '',
  role: 'driver',
  city: 'Tahoe City',
  state: 'CA',
  bio: 'I love ridesharing together with neighbors.',
  support_story: 'I lost my job and can offer rides.',
  support_preferences: ['elderly_passengers'],
  facebook_url: 'https://facebook.com/jane',
  instagram_url: 'https://instagram.com/jane',
  linkedin_url: 'https://linkedin.com/in/jane',
  airbnb_url: '',
  display_lat: 39.0968,
  display_lng: -120.0324,
  profile_photo_url: '',
  street_address: '123 Main St',
  zip_code: '96145',
};

const mockUser: User = {
  id: 'user-123',
  email: 'jane@example.com',
  aud: 'authenticated',
  app_metadata: {},
  user_metadata: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const defaultSession: Session | null = null;

const createProfileQuery = (
  overrides: Partial<UseQueryResult<UserProfile | null, Error>> = {}
): UseQueryResult<UserProfile | null, Error> =>
  ({
    data: overrides.data ?? defaultProfile,
    error: overrides.error ?? null,
    isLoading: overrides.isLoading ?? false,
    isSuccess: overrides.isSuccess ?? true,
    isError: overrides.isError ?? false,
    status: overrides.status ?? 'success',
    fetchStatus: overrides.fetchStatus ?? 'idle',
    failureCount: overrides.failureCount ?? 0,
    isFetching: overrides.isFetching ?? false,
    isRefetching: overrides.isRefetching ?? false,
    refetch: overrides.refetch ?? jest.fn(),
    dataUpdatedAt: overrides.dataUpdatedAt ?? Date.now(),
    errorUpdatedAt: overrides.errorUpdatedAt ?? Date.now(),
    ...overrides,
  }) as UseQueryResult<UserProfile | null, Error>;

const createMutationResult = (
  overrides: Partial<UseMutationResult<UserProfile, Error, UpdateProfileOptions, unknown>> = {}
): UseMutationResult<UserProfile, Error, UpdateProfileOptions, unknown> =>
  ({
    mutate: mutateMock,
    mutateAsync: jest.fn(),
    reset: jest.fn(),
    isSuccess: overrides.isSuccess ?? false,
    isError: overrides.isError ?? false,
    isIdle: overrides.isIdle ?? true,
    status: overrides.status ?? 'idle',
    failureCount: overrides.failureCount ?? 0,
    variables: overrides.variables,
    data: overrides.data,
    error: overrides.error ?? null,
    context: overrides.context,
    isPaused: overrides.isPaused ?? false,
    ...overrides,
  }) as UseMutationResult<UserProfile, Error, UpdateProfileOptions, unknown>;

const createConsentsQuery = () =>
  ({
    data: [],
    error: null,
    isLoading: false,
    isSuccess: true,
    isError: false,
    status: 'success',
    fetchStatus: 'idle',
    failureCount: 0,
    isFetching: false,
    isRefetching: false,
    refetch: jest.fn(),
    dataUpdatedAt: Date.now(),
    errorUpdatedAt: Date.now(),
  }) as unknown as ReturnType<typeof useUserConsents>;

const setHooksToDefault = () => {
  useUserMock.mockReturnValue({
    user: mockUser,
    session: defaultSession,
    loading: false,
    signOut: jest.fn(),
  });
  useUserProfileMock.mockReturnValue(createProfileQuery());
  useUpdateProfileMock.mockReturnValue(createMutationResult());
  useUserConsentsMock.mockReturnValue(createConsentsQuery());
};

describe('ProfileEditPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mutateMock.mockReset();
    pushMock.mockReset();
  });

  it('shows loading state when user or profile data is loading', () => {
    useUserMock.mockReturnValue({ user: null, session: null, loading: true, signOut: jest.fn() });
    useUserProfileMock.mockReturnValue(
      createProfileQuery({ data: null, isLoading: false, isSuccess: false })
    );
    useUpdateProfileMock.mockReturnValue(createMutationResult());

    render(<ProfileEditPage />);

    expect(screen.getByText(/Loading profile editor/i)).toBeInTheDocument();
  });

  it('prompts sign-in when no user is available', () => {
    useUserMock.mockReturnValue({ user: null, session: null, loading: false, signOut: jest.fn() });
    useUserProfileMock.mockReturnValue(
      createProfileQuery({ data: null, isLoading: false, isSuccess: false })
    );
    useUpdateProfileMock.mockReturnValue(createMutationResult());

    render(<ProfileEditPage />);

    expect(pushMock).toHaveBeenCalledWith('/login');
  });

  it('renders the form when profile data is available', async () => {
    setHooksToDefault();

    render(<ProfileEditPage />);

    await waitFor(() => expect(screen.getByDisplayValue('Jane')).toBeInTheDocument());
    expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Tahoe City')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save profile/i })).toBeInTheDocument();
  });

  it('submits sanitized payload when the form is saved', async () => {
    setHooksToDefault();
    render(<ProfileEditPage />);

    await waitFor(() => expect(screen.getByDisplayValue('Jane')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/First name/i), {
      target: { value: '  Janet ' },
    });
    fireEvent.change(screen.getByLabelText(/City/i), {
      target: { value: 'Tahoma' },
    });
    // Fill required address fields to pass validation
    fireEvent.change(screen.getByPlaceholderText('123 Main St'), {
      target: { value: '123 Test St' },
    });
    fireEvent.change(screen.getByLabelText(/State/i), {
      target: { value: 'CA' },
    });
    fireEvent.change(screen.getByLabelText(/Zip Code/i), {
      target: { value: '96145' },
    });

    // Check the terms checkbox (required for new users without existing consent)
    fireEvent.click(screen.getByLabelText(/I agree to the/i));

    fireEvent.click(screen.getByRole('button', { name: /Save profile/i }));

    expect(mutateMock).toHaveBeenCalled();
    const [submittedPayload] = mutateMock.mock.calls[0];
    expect(submittedPayload).toEqual(
      expect.objectContaining({
        profileData: expect.objectContaining({
          first_name: 'Janet',
          city: 'Tahoma',
        }),
        recordConsent: true,
      })
    );
  });

  it('shows success state once the mutation completes', async () => {
    setHooksToDefault();
    const { rerender } = render(<ProfileEditPage />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Save profile/i })).toBeInTheDocument()
    );

    useUpdateProfileMock.mockReturnValue(
      createMutationResult({ isSuccess: true, status: 'success' })
    );
    rerender(<ProfileEditPage />);

    expect(screen.getByText(/Profile saved successfully/i)).toBeInTheDocument();
  });

  it('displays error message when profile query fails', () => {
    useUserMock.mockReturnValue({
      user: mockUser,
      session: defaultSession,
      loading: false,
      signOut: jest.fn(),
    });
    useUserProfileMock.mockReturnValue(
      createProfileQuery({
        data: null,
        isLoading: false,
        isSuccess: false,
        isError: true,
        status: 'error',
        error: new Error('Fail'),
      })
    );
    useUpdateProfileMock.mockReturnValue(createMutationResult());

    render(<ProfileEditPage />);

    expect(screen.getByText(/Unable to load profile/i)).toBeInTheDocument();
  });
});
