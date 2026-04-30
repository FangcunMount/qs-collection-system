import React from "react";
import { View, Text } from "@tarojs/components";

const HomeHeader = ({ navStyle = {} }) => {
  return (
    <View className="home-header" style={navStyle}>
      <View className="home-header__brand-row">
        <View className="home-header__brand">
          <View className="home-header__brand-text">
            <Text className="home-header__brand-main">Qlume</Text>
            <Text className="home-header__brand-sub">测评</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default HomeHeader;
