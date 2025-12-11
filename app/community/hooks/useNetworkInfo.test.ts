import { renderHook, act } from '@testing-library/react';
import { useNetworkInfo } from './useNetworkInfo';

describe('useNetworkInfo', () => {
  const originalNavigator = globalThis.navigator;

  beforeEach(() => {
    // Reset navigator before each test
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
    });
  });

  it('should return null if navigator is undefined (e.g. server-side)', () => {
    delete (globalThis as { navigator?: unknown }).navigator;

    const { result } = renderHook(() => useNetworkInfo());
    expect(result.current.networkInfo).toBeNull();
  });

  it('should collect network info correctly', () => {
    const mockConnection = {
      effectiveType: '4g',
      downlink: 10,
      rtt: 50,
      saveData: false,
    };

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        userAgent: 'Test Agent',
        connection: mockConnection,
        onLine: true,
      },
      writable: true,
    });

    const { result } = renderHook(() => useNetworkInfo());

    expect(result.current.networkInfo).toMatchObject({
      userAgent: 'Test Agent',
      connectionType: '4g',
      downlink: 10,
      rtt: 50,
      saveData: false,
      online: true,
    });
    expect(result.current.networkInfo?.timestamp).toBeDefined();
  });

  it('should use default values if connection info is missing', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        userAgent: 'Test Agent',
        onLine: false,
        // No connection object
      },
      writable: true,
    });

    const { result } = renderHook(() => useNetworkInfo());

    expect(result.current.networkInfo).toMatchObject({
      userAgent: 'Test Agent',
      connectionType: 'unknown',
      downlink: 'unknown',
      rtt: 'unknown',
      saveData: false, // Default from code
      online: false,
    });
  });

  it('should update info when detectNetwork is called', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        userAgent: 'Test Agent',
        onLine: true,
      },
      writable: true,
    });

    const { result } = renderHook(() => useNetworkInfo());

    // Simulate change
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        userAgent: 'Test Agent',
        onLine: false,
      },
      writable: true,
    });

    act(() => {
      result.current.detectNetwork();
    });

    expect(result.current.networkInfo?.online).toBe(false);
  });
});
