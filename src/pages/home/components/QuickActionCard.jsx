/**
 * 快捷操作卡片组件
 */
import React from "react";
import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import "./QuickActionCard.less";

const QuickActionCard = ({ action, animationDelay = 0 }) => {
  const handleClick = () => {
    Taro.navigateTo({ url: action.url });
  };

  return (
    <View
      className="quick-action-card animate-fade-in-up"
      style={{ animationDelay: `${animationDelay}s` }}
      onClick={handleClick}
    >
      <Text className="quick-action-card__icon">{action.icon}</Text>
      <View className="quick-action-card__content">
        <Text className="quick-action-card__label">{action.label}</Text>
        <Text className="quick-action-card__desc">{action.desc}</Text>
      </View>
    </View>
  );
};

export default QuickActionCard;
