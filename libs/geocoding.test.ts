import { geocodeLocation, geocodeZipCode } from './geocoding';

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

  it('resolves a ZIP to its city and rejects a nearby but mismatched postal result', async () => {
    const address = { town: 'Truckee', state: 'California', postcode: '96161', country_code: 'us' };
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [{ lat: '39.32', lon: '-120.18', address }],
    });
    expect(await geocodeZipCode('96161')).toEqual({
      lat: 39.32,
      lng: -120.18,
      city: 'Truckee',
      state: 'California',
    });
    expect(await geocodeZipCode('96160')).toBeNull();
    expect(await geocodeZipCode('abcde')).toBeNull();
  });
});
