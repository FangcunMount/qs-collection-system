/**
 * 应用场景卡片组件
 */
import React from "react";
import { View, Text } from "@tarojs/components";
import "./ScenarioCard.less";

const ScenarioCard = ({ scenario, animationDelay = 0 }) => {
  return (
    <View
      className="scenario-card animate-fade-in-up"
      style={{ animationDelay: `${animationDelay}s` }}
    >
      <Text className="scenario-card__title">{scenario.title}</Text>
      <View className="scenario-card__items">
        {scenario.items.map((item, idx) => (
          <View key={idx} className="scenario-card__item">
            <Text className="scenario-card__item-dot">•</Text>
            <Text className="scenario-card__item-text">{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export default ScenarioCard;
