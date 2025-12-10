/**
 * 功能特性卡片组件
 */
import React from "react";
import { View, Text } from "@tarojs/components";
import "./FeatureCard.less";

const FeatureCard = ({ feature, animationDelay = 0 }) => {
  return (
    <View
      className="feature-card animate-fade-in-up"
      style={{ animationDelay: `${animationDelay}s` }}
    >
      <Text className="feature-card__icon">{feature.icon}</Text>
      <Text className="feature-card__title">{feature.title}</Text>
      <Text className="feature-card__desc">{feature.desc}</Text>
    </View>
  );
};

export default FeatureCard;
