import { createClient } from './client';

const mockCreateBrowserClient = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createBrowserClient: (...args: unknown[]) => mockCreateBrowserClient(...args),
}));

describe('createClient', () => {
  beforeEach(() => {
    mockCreateBrowserClient.mockReset();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  });

  test('calls createBrowserClient with publishable env vars', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.example';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'pubkey123';

    mockCreateBrowserClient.mockImplementation((...args: unknown[]) => ({ calledWith: args }));

    const client = createClient();

    expect(mockCreateBrowserClient).toHaveBeenCalledWith('https://supabase.example', 'pubkey123');
    expect(client).toEqual({ calledWith: ['https://supabase.example', 'pubkey123'] });
  });
});
