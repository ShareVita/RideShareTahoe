import { useCallback, useState } from 'react';
import type { NavigatorWithConnection, NetworkInfo, NetworkInformation } from '../types';

const collectNetworkInfo = (): NetworkInfo | null => {
  if (typeof navigator === 'undefined') {
    return null;
  }

  const typedNavigator = navigator as NavigatorWithConnection;
  const connection: NetworkInformation | undefined =
    typedNavigator.connection || typedNavigator.mozConnection || typedNavigator.webkitConnection;

  return {
    userAgent: typedNavigator.userAgent,
    connectionType: connection?.effectiveType || 'unknown',
    downlink: connection?.downlink || 'unknown',
    rtt: connection?.rtt || 'unknown',
    saveData: connection?.saveData || false,
    online: typedNavigator.onLine,
    timestamp: new Date().toISOString(),
  };
};

export const useNetworkInfo = () => {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(() => collectNetworkInfo());

  const detectNetwork = useCallback(() => {
    const info = collectNetworkInfo();
    if (info) {
      setNetworkInfo(info);
    }
  }, []);

  return { networkInfo, detectNetwork };
};
