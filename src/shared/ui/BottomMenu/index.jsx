import React from "react";
import { View, Text } from "@tarojs/components";
import { AtIcon } from "taro-ui";
import Taro from "@tarojs/taro";
import { ROUTES } from "../../config/routes";
import "./index.less";

const bottomMenu = [
  { label: "首页", icon: "home", url: ROUTES.tabHome },
  { label: "量表", icon: "search", url: ROUTES.tabScales },
  { label: "报告", icon: "clock", url: ROUTES.assessmentRecords },
  { label: "我的", icon: "user", url: ROUTES.tabMe },
];

const BottomMenu = ({ activeKey }) => {
  const handleMenuClick = (item) => {
    if (!item.url) {
      return;
    }

    const currentPath = Taro.getCurrentInstance().router.path;
    if (currentPath !== item.url) {
      Taro.redirectTo({ url: item.url });
    }
  };

  return (
    <View className="bottom-menu">
      {bottomMenu.map((item) => (
        <View
          key={item.label}
          className={`menu-item ${item.label === activeKey ? "active" : ""}`}
          onClick={() => handleMenuClick(item)}
        >
          <AtIcon
            value={item.icon}
            size="24"
            color={item.label === activeKey ? "#2F80ED" : "#8A96AA"}
            className="menu-item__icon"
          />
          <Text className="menu-item__label">{item.label}</Text>
        </View>
      ))}
    </View>
  );
};

export default BottomMenu;
