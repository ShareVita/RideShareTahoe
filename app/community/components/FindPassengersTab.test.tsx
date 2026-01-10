import { render, screen } from '@testing-library/react';
import FindPassengersTab from './FindPassengersTab';

import type { CommunitySupabaseClient } from '@/libs/community/ridesData';

// Mock child components
jest.mock('./passengers/PassengersSection', () => ({
  PassengersSection: () => <div data-testid="passengers-section">Passengers Section</div>,
}));

jest.mock('./members/CommunityMembersList', () => ({
  __esModule: true,
  default: () => <div data-testid="community-members-list">Community Members List</div>,
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
    expect(screen.getByTestId('community-members-list')).toBeInTheDocument();
  });
});
