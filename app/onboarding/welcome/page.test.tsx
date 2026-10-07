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

it('offers browse and optional vehicle setup without querying a removed profile role', async () => {
  const push = jest.fn();
  (useRouter as jest.Mock).mockReturnValue({ push });
  render(<WelcomePage />);
  const vehicle = await screen.findByRole('button', { name: 'Add a Vehicle (Optional)' });
  expect(screen.getByText('Ready for your next trip?')).toBeInTheDocument();
  expect(createClient).toHaveBeenCalled();
  fireEvent.click(vehicle);
  expect(push).toHaveBeenCalledWith('/vehicles');
  fireEvent.click(screen.getByRole('button', { name: 'Browse Community →' }));
  expect(push).toHaveBeenCalledWith('/community');
});
