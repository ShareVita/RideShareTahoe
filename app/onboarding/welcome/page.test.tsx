import { render, screen, fireEvent } from '@testing-library/react';
import WelcomePage from './page';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
const mockUser = { id: 'user-1' };
jest.mock('next/navigation', () => ({ useRouter: jest.fn() }));
jest.mock('@/components/providers/SupabaseUserProvider', () => ({
  useUser: () => ({ user: mockUser }),
}));
jest.mock('@/lib/supabase/client', () => ({ createClient: jest.fn(() => ({})) }));
jest.mock('@/libs/community/ridesData', () => ({
  fetchAllRides: jest.fn().mockResolvedValue({ rides: [] }),
}));
jest.mock('@/app/community/components/rides-posts/RidePostCard', () => ({
  RidePostCard: () => null,
}));
jest.mock('@/app/community/components/PostDetailModal', () => ({
  __esModule: true,
  default: () => null,
}));

beforeEach(() => window.history.replaceState({}, '', '/onboarding/welcome'));

it.each([
  ['/messages?thread=42', '/messages?thread=42'],
  ['//evil.test', '/community'],
  ['/api/auth/callback', '/community'],
])('finishes onboarding with safe next %s', async (next, destination) => {
  const push = jest.fn();
  (useRouter as jest.Mock).mockReturnValue({ push });
  window.history.replaceState({}, '', `/onboarding/welcome?next=${encodeURIComponent(next)}`);
  render(<WelcomePage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Continue →' }));
  expect(push).toHaveBeenCalledWith(destination);
});

it('offers browse and optional vehicle setup without querying a removed profile role', async () => {
  const push = jest.fn();
  (useRouter as jest.Mock).mockReturnValue({ push });
  render(<WelcomePage />);
  const vehicle = await screen.findByRole('button', { name: 'Add a Vehicle (Optional)' });
  expect(screen.getByText('Ready for your next trip?')).toBeInTheDocument();
  expect(createClient).toHaveBeenCalled();
  fireEvent.click(vehicle);
  expect(push).toHaveBeenCalledWith('/vehicles?next=%2Fcommunity');
  fireEvent.click(screen.getByRole('button', { name: 'Continue →' }));
  expect(push).toHaveBeenCalledWith('/community');
});

it('carries the requested post destination through optional vehicle setup', async () => {
  const push = jest.fn();
  (useRouter as jest.Mock).mockReturnValue({ push });
  window.history.replaceState({}, '', '/onboarding/welcome?next=%2Frides%2Fpost');
  render(<WelcomePage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Add a Vehicle (Optional)' }));
  expect(push).toHaveBeenCalledWith('/vehicles?next=%2Frides%2Fpost');
});
