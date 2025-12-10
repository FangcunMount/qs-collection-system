/**
 * 加载状态 Hook
 * 统一管理页面加载状态
 */
import { useState, useCallback } from "react";
import Taro from "@tarojs/taro";

export const useLoadingState = (initialLoading = false) => {
  const [loading, setLoading] = useState(initialLoading);

  const showLoading = useCallback((options = {}) => {
    const { title = "加载中...", mask = true } = options;
    setLoading(true);
    Taro.showLoading({ title, mask });
  }, []);

  const hideLoading = useCallback(() => {
    setLoading(false);
    Taro.hideLoading();
  }, []);

  const withLoading = useCallback(async (asyncFn, options = {}) => {
    try {
      showLoading(options);
      const result = await asyncFn();
      return result;
    } finally {
      hideLoading();
    }
  }, [showLoading, hideLoading]);

  return {
    loading,
    setLoading,
    showLoading,
    hideLoading,
    withLoading
  };
};
