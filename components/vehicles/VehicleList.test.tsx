import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VehicleList from './VehicleList';
import { readRideDraft, RIDE_DRAFT_KEY } from './rideDraft';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ vehicles: [] }) });
});

it('returns to the complete ride draft with the newly created API vehicle selected', async () => {
  window.history.replaceState({}, '', '/vehicles?next=%2Frides%2Fpost');
  sessionStorage.setItem(
    RIDE_DRAFT_KEY,
    JSON.stringify({
      ownerId: 'driver',
      data: { title: 'Ski trip', return_time: '17:30' },
      vehicleId: '',
    })
  );
  render(<VehicleList />);
  expect(await screen.findByRole('link', { name: 'return to your ride draft' })).toHaveAttribute(
    'href',
    '/rides/post'
  );
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Make'), 'Mazda');
  await user.type(screen.getByLabelText('Model'), 'CX-5');
  await user.type(screen.getByLabelText('Color'), 'Blue');
  await user.selectOptions(screen.getByLabelText('Drivetrain'), 'AWD');
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => ({ vehicle: { id: 'new-vehicle' } }),
  });
  await user.click(screen.getByRole('button', { name: 'Add Vehicle' }));
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/rides/post'));
  expect(readRideDraft()).toEqual({
    ownerId: 'driver',
    data: { title: 'Ski trip', return_time: '17:30' },
    vehicleId: 'new-vehicle',
  });
});

it.each(['https://evil.example', '//evil.example', '/login'])(
  'does not offer an unsafe return to %s',
  async (next) => {
    window.history.replaceState({}, '', `/vehicles?next=${encodeURIComponent(next)}`);
    render(<VehicleList />);
    await screen.findByRole('button', { name: 'Add Vehicle' });
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Model')).not.toBeInTheDocument();
  }
);

it('preserves onboarding next without requiring a ride draft', async () => {
  window.history.replaceState({}, '', '/vehicles?next=%2Fcommunity%3Fview%3Dmy-posts');
  render(<VehicleList />);
  const link = await screen.findByRole('link', { name: 'Return to where you left off' });
  expect(new URL(link.getAttribute('href')!, window.location.origin).href).toBe(
    `${window.location.origin}/community?view=my-posts`
  );
  expect(screen.getByLabelText('Model')).toBeInTheDocument();
});
