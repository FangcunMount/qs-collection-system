import React from "react";
import { View, Text } from "@tarojs/components";
import { AtIcon } from "taro-ui";

const getTesteeDisplayName = (testee) => {
  if (!testee) return "我自己";
  return testee.legalName || testee.name || "我自己";
};

const HomeHeader = ({
  currentTestee,
  navStyle = {},
  onManageTestee,
}) => {
  return (
    <View className="home-header" style={navStyle}>
      <View className="home-header__brand-row">
        <View className="home-header__brand">
          <Text className="home-header__brand-main">Qlume</Text>
          <Text className="home-header__brand-sub">测评</Text>
        </View>
      </View>

      <View className="home-testee-entry" onClick={onManageTestee}>
        <View className="home-testee-entry__left">
          <Text className="home-testee-entry__label">当前测评对象：</Text>
          <Text className="home-testee-entry__name">
            {getTesteeDisplayName(currentTestee)}
          </Text>
        </View>
        <View className="home-testee-entry__action">
          <Text className="home-testee-entry__action-text">切换 / 管理</Text>
          <AtIcon value="chevron-right" size="13" color="#2F80ED" />
        </View>
      </View>
    </View>
  );
};

export default HomeHeader;
