import { useEffect, useState } from "react";
import Taro from "@tarojs/taro";

export function useSubmit({ beforeSubmit = null, submit, options = {} }) {
  const [loading, setLoading] = useState(false);

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
    if (beforeSubmit && !beforeSubmit()) return false;

    try {
      setLoading(true);
      await submit();
    } catch (error) {
      Taro.nextTick(() => {
        Taro.showToast({
          title: String(error?.errmsg ?? error?.message ?? error ?? "提交失败"),
          icon: "none"
        });
      });
    } finally {
      setLoading(false);
    }

    return true;
  };

  return [loading, handleSubmit];
}

export default useSubmit;
