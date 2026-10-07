import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Login from './page';

const mockPush = jest.fn();
let mockNext = '/messages?thread=42&view=unread';
const mockAuth = {
  getSession: jest.fn(),
  signInWithOAuth: jest.fn(),
  signInWithOtp: jest.fn(),
};
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams({ next: mockNext }),
}));
jest.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: mockAuth }) }));

beforeEach(() => {
  jest.clearAllMocks();
  mockNext = '/messages?thread=42&view=unread';
  mockAuth.getSession.mockResolvedValue({ data: { session: null } });
  mockAuth.signInWithOAuth.mockResolvedValue({ error: null });
  mockAuth.signInWithOtp.mockResolvedValue({ error: null });
});

it.each(['oauth', 'otp'])('carries next through %s sign in', async (flow) => {
  render(<Login />);
  if (flow === 'oauth')
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));
  else {
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'member@example.test' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send Magic Link' }));
  }
  const signIn = flow === 'oauth' ? mockAuth.signInWithOAuth : mockAuth.signInWithOtp;
  await waitFor(() => expect(signIn).toHaveBeenCalled());
  const options = signIn.mock.calls[0][0].options;
  const url = new URL(options.redirectTo || options.emailRedirectTo);
  expect(url.origin).toBe(window.location.origin);
  expect(url.pathname).toBe('/api/auth/callback');
  expect(url.searchParams.get('next')).toBe(mockNext);
});

it.each([
  ['/messages?thread=42', '/messages?thread=42'],
  ['//evil.test', '/community'],
  ['/login', '/community'],
  ['/api/auth/callback', '/community'],
  ['', '/community'],
])('routes an existing session safely for next %s', async (next, destination) => {
  mockNext = next;
  mockAuth.getSession.mockResolvedValue({ data: { session: {} } });
  render(<Login />);
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith(destination));
});
