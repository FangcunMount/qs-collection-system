/** A small cancellation scope that also works without browser AbortController. */
export interface RequestLifetime {
  isActive: () => boolean;
  onCancel: (listener: () => void) => () => void;
  cancel: () => void;
}
export const requestCancelled = () => ({ code: 'REQUEST_CANCELLED', message: '请求已停止' });
export function createRequestLifetime(guard: () => boolean = () => true): RequestLifetime {
  let active = true;
  const listeners = new Set<() => void>();
  return {
    isActive: () => active && guard(),
    onCancel(listener) {
      if (!active) { listener(); return () => {}; }
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    cancel() {
      if (!active) return;
      active = false;
      listeners.forEach(listener => listener());
      listeners.clear();
    },
  };
}
