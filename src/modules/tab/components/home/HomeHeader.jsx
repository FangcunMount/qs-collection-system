import React from "react";
import { View, Text, Image } from "@tarojs/components";
import { AtIcon } from "taro-ui";

const getInitial = (name) => {
  const normalized = String(name || "我").trim();
  return normalized.slice(0, 1) || "我";
};

const HomeHeader = ({
  navStyle = {},
  userName = "用户",
  userAvatar = "",
  onUserClick,
}) => {
  return (
    <View className="home-header" style={navStyle}>
      <View className="home-header__brand-row">
        <View className="home-header__brand">
          <View className="home-header__brand-text">
            <Text className="home-header__brand-main">Qlume</Text>
          </View>
          <Text className="home-header__brand-subtitle">科学测评 · 了解自己 · 改变未来</Text>
        </View>
        <View className="home-header__user-pill" onClick={onUserClick}>
          {userAvatar ? (
            <Image className="home-header__avatar" src={userAvatar} mode="aspectFill" />
          ) : (
            <View className="home-header__avatar home-header__avatar--fallback">
              <Text>{getInitial(userName)}</Text>
            </View>
          )}
          <Text className="home-header__user-name">{userName}</Text>
          <AtIcon value="chevron-right" size="15" color="#64748B" />
        </View>
      </View>
    </View>
  );
};

export default HomeHeader;
