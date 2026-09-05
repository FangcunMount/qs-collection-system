import { useEffect, useState, useRef } from "react";
import Taro from "@tarojs/taro";

export function useSubmit({ beforeSubmit = null, submit, options = {} }) {
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (options.needGobalLoading && submittingRef.current) Taro.hideLoading();
    };
  }, [options.needGobalLoading]);

  useEffect(() => {
    if (!options.needGobalLoading) return;

    if (loading) {
      Taro.showLoading({
        title: options.gobalLoadingTips ?? "提交中...",
        mask: true
      });
      return;
    }

    Taro.hideLoading();
  }, [loading, options.gobalLoadingTips, options.needGobalLoading]);

  const handleSubmit = async () => {
    if (!mountedRef.current || submittingRef.current) return false;
    if (beforeSubmit && !beforeSubmit()) return false;
    submittingRef.current = true;

    try {
      setLoading(true);
      await submit();
    } catch (error) {
      if (!mountedRef.current) return false;
      Taro.nextTick(() => {
        if (!mountedRef.current) return;
        Taro.showToast({
          title: String(error?.errmsg ?? error?.message ?? error ?? "提交失败"),
          icon: "none"
        });
      });
    } finally {
      submittingRef.current = false;
      if (mountedRef.current) setLoading(false);
    }

    return true;
  };

  return [loading, handleSubmit];
}

export default useSubmit;
