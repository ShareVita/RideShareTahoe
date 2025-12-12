import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProfilesList from './ProfilesList';

// Mock dependencies
jest.mock('./ProfileCard', () => {
  return function MockProfileCard({
    profile,
    onMessage,
  }: {
    profile: { first_name: string };
    // eslint-disable-next-line no-unused-vars
    onMessage: (profile: unknown) => void;
  }) {
    return (
      <div data-testid="profile-card">
        {profile.first_name}
        <button onClick={() => onMessage(profile)}>Message</button>
      </div>
    );
  };
});

jest.mock('@/app/community/components/PaginationControls', () => {
  return {
    PaginationControls: ({
      currentPage,
      onPageChange,
    }: {
      currentPage: number;
      // eslint-disable-next-line no-unused-vars
      onPageChange: (page: number) => void;
    }) => (
      <div>
        <button onClick={() => onPageChange(currentPage - 1)}>Prev</button>
        <span>Page {currentPage}</span>
        <button onClick={() => onPageChange(currentPage + 1)}>Next</button>
      </div>
    ),
  };
});

describe('ProfilesList', () => {
  const mockOnMessage = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis.fetch as jest.Mock) = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [],
        totalCount: 0,
      }),
    });
    // Mock scrollIntoView
    globalThis.HTMLElement.prototype.scrollIntoView = jest.fn();
  });

  it('renders loading state initially', async () => {
    // Make fetch never resolve to keep loading state
    (globalThis.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    render(<ProfilesList onMessage={mockOnMessage} />);

    // Check for skeleton loader (animate-pulse class)
    // We expect multiple skeleton items
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders profiles when fetch succeeds', async () => {
    const mockProfiles = [
      { id: '1', first_name: 'John' },
      { id: '2', first_name: 'Jane' },
    ];
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        items: mockProfiles,
        totalCount: 2,
      }),
    });

    render(<ProfilesList onMessage={mockOnMessage} />);

    await waitFor(() => {
      expect(screen.getByText('John')).toBeInTheDocument();
      expect(screen.getByText('Jane')).toBeInTheDocument();
    });
  });

  it('renders error state when fetch fails', async () => {
    (globalThis.fetch as jest.Mock).mockRejectedValue(new Error('API Error'));

    render(<ProfilesList onMessage={mockOnMessage} />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load profiles/i)).toBeInTheDocument();
    });
  });

  it('renders empty state when no profiles', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [],
        totalCount: 0,
      }),
    });

    render(<ProfilesList onMessage={mockOnMessage} />);

    expect(await screen.findByText('No profiles found')).toBeInTheDocument();
  });

  it('handles pagination', async () => {
    const mockProfiles = Array.from({ length: 25 }, (_, i) => ({
      id: `${i}`,
      first_name: `User ${i}`,
    }));

    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        items: mockProfiles,
        totalCount: 50,
      }),
    });

    render(<ProfilesList onMessage={mockOnMessage} />);

    await waitFor(() => {
      expect(screen.getByText('Next')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledTimes(2); // Initial + Page 2
      // Check if the second call had page=2 param
      const url = (globalThis.fetch as jest.Mock).mock.calls[1][0];
      expect(url).toContain('page=2');
    });
  });
});
