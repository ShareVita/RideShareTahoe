import { render, screen, waitFor } from '@testing-library/react';
import CompleteProfilePage from './page';

const mockPush = jest.fn();
let mockNext = '/messages?thread=42';
let mockProfile: { first_name: string } | null = null;
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams({ next: mockNext }),
}));
jest.mock('@/hooks/useProfile', () => ({
  useUserProfile: () => ({ data: mockProfile, isLoading: false }),
}));
beforeEach(() => {
  mockPush.mockClear();
  mockProfile = null;
  mockNext = '/messages?thread=42';
});
it('carries next to the profile editor', () => {
  render(<CompleteProfilePage />);
  expect(screen.getByRole('link', { name: 'Set up Profile' })).toHaveAttribute(
    'href',
    '/profile/edit?next=%2Fmessages%3Fthread%3D42'
  );
});
it.each([
  ['/messages?thread=42', '/messages?thread=42'],
  ['//evil.test', '/community'],
  ['/login', '/community'],
])('routes an already completed profile safely for %s', async (next, destination) => {
  mockProfile = { first_name: 'Jane' };
  mockNext = next;
  render(<CompleteProfilePage />);
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith(destination));
});
