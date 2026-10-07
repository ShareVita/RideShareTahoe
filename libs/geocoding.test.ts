import { geocodeLocation } from './geocoding';

describe('geocodeLocation', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });
  it('returns coordinates from real numeric provider values', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [{ lat: '39.3279', lon: '-120.1833' }],
    });
    expect(await geocodeLocation('Truckee, CA')).toEqual({ lat: 39.3279, lng: -120.1833 });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('countrycodes=us'),
      expect.objectContaining({ signal: expect.anything() })
    );
  });
  it.each([
    ['NaN', '-120'],
    ['91', '-120'],
    ['39', '181'],
  ])('rejects invalid coordinates %s %s', async (lat, lon) => {
    (fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => [{ lat, lon }] });
    expect(await geocodeLocation('Truckee')).toBeNull();
  });
  it('returns null on timeout or provider failure rather than blocking posting', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (fetch as jest.Mock).mockRejectedValue(new Error('timeout'));
    expect(await geocodeLocation('Truckee')).toBeNull();
    spy.mockRestore();
  });
});
