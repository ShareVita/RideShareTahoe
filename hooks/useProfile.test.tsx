import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { ReactNode } from 'react';

// Import hooks and type definitions from the file being tested
import {
  useUserProfile,
  useUserDogs,
  useUpdateProfile,
  UserProfile,
  UserDog,
  UpdatableProfileData,
} from './useProfile'; // Corrected import from useProfile

// #region Mock Dependencies

// 1. Mock useUser hook
const mockUser = { id: 'user-abc-123', email: 'test@example.com' };
const mockUseUser = jest.fn();
jest.mock('@/components/providers/SupabaseUserProvider', () => ({
  useUser: () => mockUseUser(),
}));

const mockSingle = jest.fn();
const mockOrder = jest.fn();

// --- Dedicated Query Chain Mocks (Self-Contained Logic) ---

// Profile/Mutation Chain: .select().eq().single() OR .update().eq().select().single()
// Capture chains for inspection
type ProfileChain = {
  select: jest.Mock;
  update: jest.Mock;
  upsert: jest.Mock;
};

type PrivateInfoChain = {
  select: jest.Mock;
  update: jest.Mock;
};

type SocialChain = {
  select: jest.Mock;
  upsert: jest.Mock;
};

let capturedProfileChains: ProfileChain[] = [];
let capturedPrivateInfoChains: PrivateInfoChain[] = [];
let capturedSocialChains: SocialChain[] = [];

const createProfileChain = () => {
  // Define the final object that contains the mockSingle implementation
  const finalChain = { single: mockSingle, maybeSingle: mockSingle };
  const selectChain = { eq: jest.fn().mockReturnValue(finalChain) };

  const updateEqChain = {
    eq: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue(finalChain), // update().eq().select() returns final single object
    }),
  };

  const chain = {
    select: jest.fn().mockReturnValue(selectChain), // Query path
    update: jest.fn().mockReturnValue(updateEqChain), // Mutation path
    upsert: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue(finalChain) }), // Upsert path
  };

  capturedProfileChains.push(chain);
  return chain;
};

// Private Info Chain: .update().eq()
const createPrivateInfoChain = () => {
  const updateChain = {
    eq: jest.fn().mockResolvedValue({ data: null, error: null }),
  };

  const chain = {
    select: jest
      .fn()
      .mockReturnValue({ eq: jest.fn().mockReturnValue({ maybeSingle: mockSingle }) }),
    update: jest.fn().mockReturnValue(updateChain),
  };

  capturedPrivateInfoChains.push(chain);
  return chain;
};

// Social Chain: .upsert()
const createSocialChain = () => {
  const chain = {
    select: jest
      .fn()
      .mockReturnValue({ eq: jest.fn().mockReturnValue({ maybeSingle: mockSingle }) }),
    upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
  };

  capturedSocialChains.push(chain);
  return chain;
};

// Dogs Chain: .select().eq().order()
const createDogsChain = () => {
  const orderChain = { order: mockOrder };
  const eqChain = { eq: jest.fn().mockReturnValue(orderChain) };

  return {
    select: jest.fn().mockReturnValue(eqChain),
  };
};

// 3. Mock Supabase from function
const mockFrom = jest.fn((table: string) => {
  if (table === 'profiles') return createProfileChain();
  if (table === 'user_private_info') return createPrivateInfoChain();
  if (table === 'profile_socials') return createSocialChain();
  if (table === 'dogs') return createDogsChain();
  return createProfileChain(); // Fallback
});

const mockSupabase = {
  from: mockFrom,
};

// 4. Mock createClient
jest.mock('@/libs/supabase/client', () => ({
  createClient: jest.fn(() => mockSupabase),
}));

// 5. Create a Query Client Wrapper
const createWrapper = (queryClient: QueryClient) => {
  const QueryProvider = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  QueryProvider.displayName = 'QueryProvider';

  return QueryProvider;
};

// #endregion Mock Dependencies

describe('Data Hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    capturedProfileChains = [];
    capturedPrivateInfoChains = [];
    capturedSocialChains = [];
    mockUseUser.mockReturnValue({ user: mockUser, loading: false });
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  // Custom render hook function
  const renderHookWithClient = <TResult,>(hook: () => TResult) => {
    return renderHook(hook, { wrapper: createWrapper(queryClient) });
  };

  // #region useUserProfile Tests

  describe('useUserProfile', () => {
    const mockProfile: UserProfile = {
      id: mockUser.id,
      first_name: 'John',
      last_name: 'Doe',
      email: mockUser.email,
      profile_photo_url: null,
      display_lat: 0,
      display_lng: 0,
      street_address: null,
      zip_code: null,
      custom_field: 'test',
    };

    it('should fetch profile data successfully', async () => {
      const privateInfo = {
        street_address: '123 Main St',
        zip_code: '94102',
      };

      const socials = {
        instagram_url: 'https://instagram.com/john',
        facebook_url: null,
        linkedin_url: null,
        airbnb_url: null,
      };

      const expectedMergedProfile = {
        ...mockProfile,
        ...privateInfo,
        ...socials,
      };

      // 3 sequential maybeSingle() calls:
      // 1) profiles, 2) user_private_info, 3) profile_socials
      mockSingle
        .mockResolvedValueOnce({ data: mockProfile, error: null })
        .mockResolvedValueOnce({ data: privateInfo, error: null })
        .mockResolvedValueOnce({ data: socials, error: null });

      const { result } = renderHookWithClient(useUserProfile);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert all 3 tables were queried
      expect(mockFrom).toHaveBeenCalledWith('profiles');
      expect(mockFrom).toHaveBeenCalledWith('user_private_info');
      expect(mockFrom).toHaveBeenCalledWith('profile_socials');

      // Optional: verify profiles query eq
      const profilesCall = mockFrom.mock.results.find((r) => r.value?.select)?.value;
      if (profilesCall) {
        expect(profilesCall.select().eq).toHaveBeenCalledWith('id', mockUser.id);
      }

      expect(result.current.data).toEqual(expectedMergedProfile);
    });

    it('should return null if user is not logged in', async () => {
      mockUseUser.mockReturnValue({ user: null, loading: false });

      const { result } = renderHookWithClient(useUserProfile);

      expect(result.current.status).toBe('pending');
      expect(result.current.isFetching).toBe(false);
      expect(result.current.data).toBe(undefined);
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('should handle fetch errors gracefully', async () => {
      const mockError = { message: 'DB Failed' };
      mockSingle.mockResolvedValue({ data: null, error: mockError });

      const { result } = renderHookWithClient(useUserProfile);

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('DB Failed');
    });
  });

  // #endregion useUserProfile Tests

  // #region useUserDogs Tests

  describe('useUserDogs', () => {
    const mockDogs: UserDog[] = [
      {
        id: 'd1',
        owner_id: mockUser.id,
        name: 'Skippy',
        breed: 'Pug',
        birthday: '2020-01-01',
        age_years: 3,
        age_months: 36,
        size: '0-10',
        photo_url: null,
        gender: 'male',
        neutered: true,
        temperament: ['friendly', 'playful'],
        energy_level: 'moderate',
        dog_friendly: true,
        cat_friendly: false,
        kid_friendly: true,
        leash_trained: true,
        crate_trained: false,
        house_trained: true,
        fully_vaccinated: true,
        activities: ['fetch', 'walks'],
        description: 'Loves to play fetch.',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      },
      {
        id: 'd2',
        owner_id: mockUser.id,
        name: 'Spot',
        breed: 'Lab',
        birthday: '2018-01-01',
        age_years: 5,
        age_months: 60,
        size: '41-70',
        photo_url: null,
        gender: 'female',
        neutered: true,
        temperament: ['gentle', 'active'],
        energy_level: 'high',
        dog_friendly: true,
        cat_friendly: true,
        kid_friendly: true,
        leash_trained: true,
        crate_trained: true,
        house_trained: true,
        fully_vaccinated: true,
        activities: ['swimming', 'running'],
        description: 'Enjoys swimming and running.',
        created_at: '2023-01-02T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z',
      },
    ];

    it('should fetch user dogs successfully', async () => {
      mockOrder.mockResolvedValue({ data: mockDogs, error: null });

      const { result } = renderHookWithClient(useUserDogs);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockFrom).toHaveBeenCalledWith('dogs');

      // Dogs Chain: .select().eq().order()
      const dogsChain = mockFrom.mock.results.find((r) => r.value?.select().order)?.value;
      if (dogsChain) {
        expect(dogsChain.select().eq).toHaveBeenCalledWith('owner_id', mockUser.id);
      }

      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(result.current.data).toEqual(mockDogs);
    });

    it('should return empty array if user is not logged in', async () => {
      mockUseUser.mockReturnValue({ user: null, loading: false });

      const { result } = renderHookWithClient(useUserDogs);

      expect(result.current.status).toBe('pending');
      expect(result.current.isFetching).toBe(false);
      expect(result.current.data).toBe(undefined);
    });

    it('should handle fetch errors gracefully', async () => {
      const mockError = { message: 'Dog DB Failed' };
      mockOrder.mockResolvedValue({ data: null, error: mockError });

      const { result } = renderHookWithClient(useUserDogs);

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe('Dog DB Failed');
    });
  });

  // #endregion useUserDogs Tests

  // #region useUpdateProfile Tests

  describe('useUpdateProfile', () => {
    const currentProfile: UserProfile = {
      id: mockUser.id,
      first_name: 'John',
      last_name: 'Doe',
      email: mockUser.email,
      profile_photo_url: null,
      display_lat: 37.7749,
      display_lng: -122.4194,
      street_address: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      zip_code: '94102',
      bio: 'Hello world',
      pronouns: 'he/him',
      facebook_url: 'https://facebook.com/john',
      instagram_url: null,
      linkedin_url: null,
      airbnb_url: null,
    };

    let invalidateQueriesSpy: jest.SpyInstance;
    let getQueryDataSpy: jest.SpyInstance;

    beforeEach(() => {
      invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
      getQueryDataSpy = jest.spyOn(queryClient, 'getQueryData').mockReturnValue(currentProfile);
      mockSingle.mockResolvedValue({ data: currentProfile, error: null });
    });

    afterEach(() => {
      invalidateQueriesSpy.mockRestore();
      getQueryDataSpy.mockRestore();
    });

    it('should update profile successfully and invalidate queries', async () => {
      const updatePayload: UpdatableProfileData = { first_name: 'Jane' };
      const updatedProfile: UserProfile = { ...currentProfile, first_name: 'Jane' };

      mockSingle.mockResolvedValue({ data: updatedProfile, error: null });

      const { result } = renderHookWithClient(useUpdateProfile);

      result.current.mutate({ profileData: updatePayload });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Find the specific upsert mock instance that was called
      const upsertMockInstance = capturedProfileChains
        .map((chain) => chain.upsert)
        .find((upsertMock) => upsertMock && upsertMock.mock.calls.length > 0);

      expect(upsertMockInstance).toBeDefined();
      expect(upsertMockInstance).toHaveBeenCalledWith({
        id: mockUser.id,
        // Only the changed field should be included
        first_name: 'Jane',
      });

      // Check invalidation call
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['profile', mockUser.id] });
      expect(result.current.data).toEqual(updatedProfile);
    });

    it('should NOT update profiles table when no public fields change', async () => {
      // Payload with same values as current profile
      const updatePayload: UpdatableProfileData = {
        first_name: 'John', // Same as current
        last_name: 'Doe', // Same as current
      };

      const { result } = renderHookWithClient(useUpdateProfile);

      result.current.mutate({ profileData: updatePayload });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Verify no upsert was called for profiles table
      const calledUpsertMocks = capturedProfileChains
        .map((chain) => chain.upsert)
        .filter((upsertMock) => upsertMock && upsertMock.mock.calls.length > 0);

      expect(calledUpsertMocks.length).toBe(0);
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['profile', mockUser.id] });
    });

    it('should only update profiles table when public fields change', async () => {
      const updatePayload: UpdatableProfileData = {
        first_name: 'Jane',
        street_address: '123 Main St', // Private field - same as current
      };
      const updatedProfile: UserProfile = { ...currentProfile, first_name: 'Jane' };

      mockSingle.mockResolvedValue({ data: updatedProfile, error: null });

      const { result } = renderHookWithClient(useUpdateProfile);

      result.current.mutate({ profileData: updatePayload });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Profiles table should be updated
      const profilesUpsert = capturedProfileChains
        .map((chain) => chain.upsert)
        .find((upsertMock) => upsertMock && upsertMock.mock.calls.length > 0);

      expect(profilesUpsert).toHaveBeenCalled();

      // Private info should NOT be updated (same value)
      const privateInfoUpdates = capturedPrivateInfoChains
        .map((chain) => chain.update)
        .filter((updateMock) => updateMock && updateMock.mock.calls.length > 0);

      expect(privateInfoUpdates.length).toBe(0);
    });

    it('should only update user_private_info when private fields change', async () => {
      const updatePayload: UpdatableProfileData = {
        street_address: '456 Oak Ave', // Changed
        first_name: 'John', // Same as current
      };

      const { result } = renderHookWithClient(useUpdateProfile);

      result.current.mutate({ profileData: updatePayload });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Private info should be updated
      const privateInfoUpdate = capturedPrivateInfoChains
        .map((chain) => chain.update)
        .find((updateMock) => updateMock && updateMock.mock.calls.length > 0);

      expect(privateInfoUpdate).toBeDefined();
      expect(privateInfoUpdate).toHaveBeenCalled();

      // Profiles table should NOT be updated (same values)
      const profilesUpserts = capturedProfileChains
        .map((chain) => chain.upsert)
        .filter((upsertMock) => upsertMock && upsertMock.mock.calls.length > 0);

      expect(profilesUpserts.length).toBe(0);
    });

    it('should only update profile_socials when social fields change', async () => {
      const updatePayload: UpdatableProfileData = {
        instagram_url: 'https://instagram.com/john', // Changed
        facebook_url: 'https://facebook.com/john', // Same as current
        first_name: 'John', // Same as current
      };

      const { result } = renderHookWithClient(useUpdateProfile);

      result.current.mutate({ profileData: updatePayload });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Social table should be updated
      const socialUpsert = capturedSocialChains
        .map((chain) => chain.upsert)
        .find((upsertMock) => upsertMock && upsertMock.mock.calls.length > 0);

      expect(socialUpsert).toBeDefined();
      expect(socialUpsert).toHaveBeenCalledWith({
        user_id: mockUser.id,
        instagram_url: 'https://instagram.com/john', // Only changed field
      });

      // Profiles table should NOT be updated
      const profilesUpserts = capturedProfileChains
        .map((chain) => chain.upsert)
        .filter((upsertMock) => upsertMock && upsertMock.mock.calls.length > 0);

      expect(profilesUpserts.length).toBe(0);
    });

    it('should NOT update profile_socials when no social fields change', async () => {
      const updatePayload: UpdatableProfileData = {
        facebook_url: 'https://facebook.com/john', // Same as current
        instagram_url: null, // Same as current
      };

      const { result } = renderHookWithClient(useUpdateProfile);

      result.current.mutate({ profileData: updatePayload });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Social table should NOT be updated
      const socialUpserts = capturedSocialChains
        .map((chain) => chain.upsert)
        .filter((upsertMock) => upsertMock && upsertMock.mock.calls.length > 0);

      expect(socialUpserts.length).toBe(0);
    });

    it('should handle null and undefined as equivalent when comparing', async () => {
      // Current profile has instagram_url: null
      const updatePayload: UpdatableProfileData = {
        instagram_url: null, // Same as current (null)
      };

      const { result } = renderHookWithClient(useUpdateProfile);

      result.current.mutate({ profileData: updatePayload });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Social table should NOT be updated (null === null after normalization)
      const socialUpserts = capturedSocialChains
        .map((chain) => chain.upsert)
        .filter((upsertMock) => upsertMock && upsertMock.mock.calls.length > 0);

      expect(socialUpserts.length).toBe(0);
    });

    it('should update multiple tables when fields in each change', async () => {
      const updatePayload: UpdatableProfileData = {
        first_name: 'Jane', // Changed - profiles table
        street_address: '456 Oak Ave', // Changed - private info table
        instagram_url: 'https://instagram.com/jane', // Changed - socials table
      };
      const updatedProfile: UserProfile = { ...currentProfile, first_name: 'Jane' };

      mockSingle.mockResolvedValue({ data: updatedProfile, error: null });

      const { result } = renderHookWithClient(useUpdateProfile);

      result.current.mutate({ profileData: updatePayload });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // All three tables should be updated
      const profilesUpsert = capturedProfileChains
        .map((chain) => chain.upsert)
        .find((upsertMock) => upsertMock && upsertMock.mock.calls.length > 0);

      const privateInfoUpdate = capturedPrivateInfoChains
        .map((chain) => chain.update)
        .find((updateMock) => updateMock && updateMock.mock.calls.length > 0);

      const socialUpsert = capturedSocialChains
        .map((chain) => chain.upsert)
        .find((upsertMock) => upsertMock && upsertMock.mock.calls.length > 0);

      expect(profilesUpsert).toBeDefined();
      expect(privateInfoUpdate).toBeDefined();
      expect(socialUpsert).toBeDefined();
    });

    it('should throw error if user is not authenticated during mutation', async () => {
      mockUseUser.mockReturnValue({ user: null });
      const { result } = renderHookWithClient(useUpdateProfile);

      const updatePayload: UpdatableProfileData = { first_name: 'Jane' };
      result.current.mutate({ profileData: updatePayload });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('User not authenticated');

      // Verify no upsert mock was called
      const calledUpsertMocks = capturedProfileChains
        .map((chain) => chain.upsert)
        .filter((upsertMock) => upsertMock && upsertMock.mock.calls.length > 0);

      expect(calledUpsertMocks.length).toBe(0);
    });

    it('should handle mutation errors gracefully', async () => {
      const mockError = { message: 'Update failed' };
      mockSingle.mockResolvedValue({ data: null, error: mockError });

      const { result } = renderHookWithClient(useUpdateProfile);

      const updatePayload: UpdatableProfileData = { first_name: 'Jane' };
      result.current.mutate({ profileData: updatePayload });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error?.message).toBe('Update failed');
      expect(invalidateQueriesSpy).not.toHaveBeenCalled();
    });
  });

  // #endregion useUpdateProfile Tests
});
