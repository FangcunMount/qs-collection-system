import { useEffect, useState } from 'react';
import Taro from '@tarojs/taro';

// null means we have no reliable device observation yet. It is neither online
// nor offline, and the actual submission response remains authoritative.
export function useNetworkConnection(): boolean | null {
  const [connected, setConnected] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    let revision = 0;
    const onChange = (event: Taro.onNetworkStatusChange.CallbackResult) => {
      if (!active) return;
      revision += 1;
      setConnected(event.isConnected);
    };
    const subscribable = typeof Taro.onNetworkStatusChange === 'function';
    if (subscribable) Taro.onNetworkStatusChange(onChange);
    if (typeof Taro.getNetworkType === 'function') {
      const initialRevision = revision;
      void Taro.getNetworkType().then(({ networkType }) => {
        if (!active || revision !== initialRevision) return;
        setConnected(networkType === 'none' ? false : networkType === 'unknown' ? null : true);
      }).catch(() => { /* Absence of a device observation is not proof of offline state. */ });
    }
    return () => {
      active = false;
      if (subscribable && typeof Taro.offNetworkStatusChange === 'function') Taro.offNetworkStatusChange(onChange);
    };
  }, []);
  return connected;
}
