import { render, screen } from '@testing-library/react';
import FindPassengersTab from './FindPassengersTab';

import type { CommunitySupabaseClient } from '@/libs/community/ridesData';

// Mock child components
jest.mock('./passengers/PassengersSection', () => ({
  PassengersSection: () => <div data-testid="passengers-section">Passengers Section</div>,
}));

jest.mock('./passengers/PassengersList', () => ({
  __esModule: true,
  default: () => <div data-testid="passengers-list">Passengers List</div>,
}));

describe('FindPassengersTab', () => {
  const mockSupabase = {} as unknown as CommunitySupabaseClient;
  const mockUser = { id: 'user-1' };
  const mockOpenMessageModal = jest.fn();

  it('should render correct sections', () => {
    render(
      <FindPassengersTab
        user={mockUser}
        supabase={mockSupabase}
        openMessageModal={mockOpenMessageModal}
      />
    );

    expect(screen.getByTestId('passengers-section')).toBeInTheDocument();
    expect(screen.getByText('Passengers in the Community')).toBeInTheDocument();
    expect(screen.getByTestId('passengers-list')).toBeInTheDocument();
  });
});
