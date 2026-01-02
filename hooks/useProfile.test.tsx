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
  UpdateProfileOptions,
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
interface MockChain {
  select: jest.Mock;
  update: jest.Mock;
  upsert: jest.Mock;
}

let capturedProfileChains: MockChain[] = [];

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
      mockSingle.mockResolvedValue({ data: mockProfile, error: null });

      const { result } = renderHookWithClient(useUserProfile);

      // Successfully waits for the query to resolve
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockFrom).toHaveBeenCalledWith('profiles');
      // Verify that the inner mock 'eq' was called
      const profileChain = mockFrom.mock.results.find((r) => r.value.select)?.value;
      if (profileChain) {
        expect(profileChain.select().eq).toHaveBeenCalledWith('id', mockUser.id);
      }
      expect(result.current.data).toEqual(mockProfile);
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
    const updatePayload: UpdateProfileOptions = { profileData: { first_name: 'Jane' } };
    const updatedProfile: UserProfile = { ...mockUser, first_name: 'Jane' } as UserProfile;

    let invalidateQueriesSpy: jest.SpyInstance;

    beforeEach(() => {
      invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
      mockSingle.mockResolvedValue({ data: updatedProfile, error: null });
    });

    afterEach(() => {
      invalidateQueriesSpy.mockRestore();
    });

    it('should update profile successfully and invalidate queries', async () => {
      const { result } = renderHookWithClient(useUpdateProfile);

      result.current.mutate(updatePayload);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Find the specific upsert mock instance that was called
      const upsertMockInstance = capturedProfileChains
        .map((chain) => chain.upsert)
        .find((upsertMock) => upsertMock && upsertMock.mock.calls.length > 0);

      expect(upsertMockInstance).toBeDefined();
      expect(upsertMockInstance).toHaveBeenCalledWith({
        id: mockUser.id,
        // email is not passed in the update payload for this test case
        // email: mockUser.email,
        ...updatePayload.profileData,
      });

      // Check invalidation call
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['profile', mockUser.id] });
      expect(result.current.data).toEqual(updatedProfile);
    });

    it('should throw error if user is not authenticated during mutation', async () => {
      mockUseUser.mockReturnValue({ user: null });
      const { result } = renderHookWithClient(useUpdateProfile);

      result.current.mutate(updatePayload);

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

      result.current.mutate(updatePayload);

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error?.message).toBe('Update failed');
      expect(invalidateQueriesSpy).not.toHaveBeenCalled();
    });
  });

  // #endregion useUpdateProfile Tests
});
