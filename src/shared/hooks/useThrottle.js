import _ from "lodash";
import { useRef, useCallback, useEffect } from "react";

export function useThrottle(cb, delay) {
  const options = { leading: true, trailing: false };
  const cbRef = useRef(cb);

  useEffect(() => {
    cbRef.current = cb;
  }, [cb]);

  return useCallback(
    _.throttle((...args) => cbRef.current(...args), delay, options),
    [delay]
  );
}

export default useThrottle;
