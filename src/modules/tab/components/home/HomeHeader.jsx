import React from "react";
import { View, Text } from "@tarojs/components";

const HomeHeader = ({
  navStyle = {},
}) => {
  return (
    <View className="home-header" style={navStyle}>
      <View className="home-header__brand-row">
        <Text className="home-header__brand-main">Qlume</Text>
      </View>
    </View>
  );
};

export default HomeHeader;
