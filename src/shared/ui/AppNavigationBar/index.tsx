import React, { useMemo } from "react";
import { Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";

import type { DomainTone } from "../types";
import "./index.less";

export interface AppNavigationBarProps {
  title?: string;
  brandTitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  tone?: DomainTone;
  transparent?: boolean;
  className?: string;
}

interface NavigationMetrics {
  statusBarHeight: number;
  contentHeight: number;
  capsuleRightInset: number;
}

const readNavigationMetrics = (): NavigationMetrics => {
  try {
    const systemInfo = Taro.getSystemInfoSync();
    const capsule = Taro.getMenuButtonBoundingClientRect?.();
    const windowWidth = systemInfo.windowWidth || systemInfo.screenWidth || 0;
    const contentHeight = capsule?.height
      ? capsule.height + Math.max((capsule.top || 0) - (systemInfo.statusBarHeight || 0), 0) * 2
      : 44;

    return {
      statusBarHeight: systemInfo.statusBarHeight || 0,
      contentHeight,
      capsuleRightInset: capsule?.left && windowWidth
        ? Math.max(windowWidth - capsule.left, 0)
        : 88,
    };
  } catch (_error) {
    return { statusBarHeight: 0, contentHeight: 44, capsuleRightInset: 88 };
  }
};

const AppNavigationBar = ({
  title = "",
  brandTitle = "Qlume",
  showBack = false,
  onBack,
  tone = "neutral",
  transparent = false,
  className = "",
}: AppNavigationBarProps) => {
  const metrics = useMemo(readNavigationMetrics, []);
  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    Taro.navigateBack({ delta: 1 });
  };

  return (
    <View
      className={[
        "app-navigation-bar",
        `app-navigation-bar--${tone}`,
        transparent ? "app-navigation-bar--transparent" : "",
        className,
      ].filter(Boolean).join(" ")}
      style={{ paddingTop: `${metrics.statusBarHeight}px` }}
    >
      <View
        className="app-navigation-bar__row"
        style={{
          height: `${metrics.contentHeight}px`,
          paddingRight: `${metrics.capsuleRightInset}px`,
        }}
      >
        <View className="app-navigation-bar__leading">
          {showBack ? (
            <View
              className="app-navigation-bar__back"
              hoverClass="app-navigation-bar__back--pressed"
              onClick={handleBack}
            >
              <Text className="app-navigation-bar__back-icon">‹</Text>
            </View>
          ) : (
            <Text className="app-navigation-bar__brand">{brandTitle}</Text>
          )}
        </View>
        <Text className="app-navigation-bar__title">{title}</Text>
      </View>
    </View>
  );
};

export default AppNavigationBar;
