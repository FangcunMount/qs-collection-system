/**
 * 加载中组件
 * 统一的加载状态展示
 */
import React from "react";
import { View } from "@tarojs/components";
import { AtActivityIndicator } from "taro-ui";

const LoadingState = ({ 
  content = "加载中...", 
  mode = "center",
  size = 48,
  className = ""
}) => {
  return (
    <View className={`loading-state ${className}`}>
      <AtActivityIndicator 
        mode={mode} 
        content={content}
        size={size}
      />
    </View>
  );
};

export default LoadingState;
