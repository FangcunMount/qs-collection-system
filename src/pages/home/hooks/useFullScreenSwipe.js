/**
 * 全屏滑动切换 Hook
 */
import { useState, useEffect, useCallback } from "react";

export const useFullScreenSwipe = (totalScreens = 3) => {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [touchStartY, setTouchStartY] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [animateScreen, setAnimateScreen] = useState(0);

  useEffect(() => {
    // 每次切换屏幕时，延迟触发动画
    const timer = setTimeout(() => {
      setAnimateScreen(currentScreen);
    }, 100);

    return () => clearTimeout(timer);
  }, [currentScreen]);

  // 切换到指定屏幕
  const switchToScreen = useCallback((screenIndex) => {
    if (screenIndex < 0 || screenIndex >= totalScreens || isTransitioning) return;

    setIsTransitioning(true);
    setCurrentScreen(screenIndex);

    setTimeout(() => {
      setIsTransitioning(false);
    }, 600);
  }, [totalScreens, isTransitioning]);

  // 触摸开始
  const handleTouchStart = (e) => {
    if (isTransitioning) return;
    setTouchStartY(e.touches[0].clientY);
  };

  // 触摸结束，判断方向
  const handleTouchEnd = (e) => {
    if (isTransitioning) return;

    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY - touchEndY;
    const threshold = 50; // 滑动阈值

    if (Math.abs(diff) < threshold) return;

    if (diff > 0 && currentScreen < totalScreens - 1) {
      // 向上滑动 -> 下一屏
      switchToScreen(currentScreen + 1);
    } else if (diff < 0 && currentScreen > 0) {
      // 向下滑动 -> 上一屏
      switchToScreen(currentScreen - 1);
    }
  };

  // 鼠标滚轮事件
  useEffect(() => {
    let wheelTimer = null;

    const handleWheel = (e) => {
      if (isTransitioning) return;

      e.preventDefault();

      // 防抖处理
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => {
        if (e.deltaY > 0 && currentScreen < totalScreens - 1) {
          switchToScreen(currentScreen + 1);
        } else if (e.deltaY < 0 && currentScreen > 0) {
          switchToScreen(currentScreen - 1);
        }
      }, 50);
    };

    if (process.env.TARO_ENV === "h5") {
      window.addEventListener("wheel", handleWheel, { passive: false });
      return () => {
        window.removeEventListener("wheel", handleWheel);
        clearTimeout(wheelTimer);
      };
    }
  }, [currentScreen, isTransitioning, totalScreens, switchToScreen]);

  return {
    currentScreen,
    animateScreen,
    isTransitioning,
    switchToScreen,
    handleTouchStart,
    handleTouchEnd
  };
};
