import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

jest.mock('@/libs/supabase/client', () => ({
  createClient: jest.fn(),
}));

import { createClient } from '@/libs/supabase/client';
import { useIsBlocked } from './useIsBlocked';

function TestComponent({ otherUserId }: { otherUserId?: string }) {
  const { isBlocked, loading } = useIsBlocked(otherUserId);
  return (
    <div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="blocked">{String(isBlocked)}</div>
    </div>
  );
}

describe('useIsBlocked', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns blocked=true when RPC returns true', async () => {
    (createClient as jest.Mock).mockReturnValue({
      rpc: jest.fn().mockResolvedValue({ data: true, error: null }),
    });

    render(<TestComponent otherUserId="user-1" />);

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('blocked').textContent).toBe('true');
  });

  it('returns blocked=false when RPC returns false', async () => {
    (createClient as jest.Mock).mockReturnValue({
      rpc: jest.fn().mockResolvedValue({ data: false, error: null }),
    });

    render(<TestComponent otherUserId="user-2" />);

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('blocked').textContent).toBe('false');
  });
});
