/**
 * 空状态组件
 * 统一的数据为空展示
 */
import React from "react";
import { View, Text } from "@tarojs/components";
import { AtButton } from "taro-ui";

const EmptyState = ({
  text = "暂无数据",
  icon = "📭",
  buttonText,
  onButtonClick,
  className = ""
}) => {
  return (
    <View className={`empty-state ${className}`}>
      <Text className="empty-state__icon">{icon}</Text>
      <Text className="empty-state__text">{text}</Text>
      {buttonText && onButtonClick && (
        <AtButton
          type="primary"
          size="small"
          onClick={onButtonClick}
          className="empty-state__button"
        >
          {buttonText}
        </AtButton>
      )}
    </View>
  );
};

export default EmptyState;
