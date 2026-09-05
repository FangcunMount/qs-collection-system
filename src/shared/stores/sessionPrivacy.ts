import Taro from '@tarojs/taro';

export const PRIVATE_SESSION_PREFIX = 'qlume:session:';
let revision = 0;
const listeners = new Set<() => void>();
export const getSessionRevision = () => revision;
export const onSessionCleared = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
export function clearPrivateSessionState() {
  revision += 1;
  try {
    Taro.getStorageInfoSync().keys.filter(key => key.startsWith(PRIVATE_SESSION_PREFIX))
      .forEach(key => Taro.removeStorageSync(key));
  } catch (_) { /* Storage may be unavailable; in-memory state must still expire. */ }
  listeners.forEach(listener => listener());
}
