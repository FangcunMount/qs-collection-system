import _ from "lodash"
import Taro from "@tarojs/taro";
import { useRef, useCallback, useEffect, useState } from 'react'

export function useThrottle(cb, delay) {
  const options = { leading: true, trailing: false }; // add custom lodash options
  const cbRef = useRef(cb);
  // use mutable ref to make useCallback/throttle not depend on `cb` dep
  useEffect(() => { cbRef.current = cb; });
  return useCallback(
    _.throttle((...args) => cbRef.current(...args), delay, options),
    [delay]
  );
}

export function useSubmit({ beforeSubmit = null, submit, options }) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!options.needGobalLoading) return;

    if (loading) {
      Taro.showLoading({
        title: options.gobalLoadingTips ?? "提交中...",
        mask: true
      });
    } else {
      Taro.hideLoading();
    }
  }, [options.needGobalLoading, loading]);

  const handleSubmit = async () => {
    if (beforeSubmit && !beforeSubmit()) return false;
    try {
      setLoading(true);
      await submit();
      setLoading(false);
    } catch (error) {
      setLoading(false);
      Taro.nextTick(() => {
        Taro.showToast({ title: String(error?.errmsg ?? error?.message ?? error ?? '提交失败'), icon: "none" });
      });
    }
  };

  return [loading, handleSubmit];
}
