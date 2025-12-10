/**
 * 屏幕指示器组件
 */
import React from "react";
import { View } from "@tarojs/components";
import "./ScreenIndicator.less";

const ScreenIndicator = ({ currentScreen, totalScreens = 3, onSwitch }) => {
  return (
    <View className="screen-indicator">
      {Array.from({ length: totalScreens }, (_, index) => (
        <View
          key={index}
          className={`indicator-dot ${currentScreen === index ? "active" : ""}`}
          onClick={() => onSwitch(index)}
        />
      ))}
    </View>
  );
};

export default ScreenIndicator;
