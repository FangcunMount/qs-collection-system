import React from "react";
import { Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import Icon from "../Icon";
import type { IconName } from "../Icon";

import { ROUTES, routes } from "../../config/routes";
import { ASSESSMENT_KIND } from "../../lib/assessmentKind";
import "./index.less";

export interface BottomMenuProps {
  activeKey: string;
}

interface BottomMenuItem {
  label: string;
  icon: IconName;
  url: string;
}

const bottomMenu: BottomMenuItem[] = [
  { label: "首页", icon: "home", url: ROUTES.tabHome },
  { label: "量表", icon: "list", url: ROUTES.tabScales },
  {
    label: "报告",
    icon: "file",
    url: routes.assessmentRecords({ kind: ASSESSMENT_KIND.MEDICAL }),
  },
  { label: "我的", icon: "user", url: ROUTES.tabMe },
];

const BottomMenu = ({ activeKey }: BottomMenuProps) => {
  const handleMenuClick = (item: BottomMenuItem) => {
    const currentPath = Taro.getCurrentInstance().router?.path;
    const targetPath = item.url.split("?")[0];
    if (currentPath !== targetPath) {
      Taro.redirectTo({ url: item.url });
    }
  };

  const renderTab = (item: BottomMenuItem) => {
    const isActive = item.label === activeKey;
    return (
      <View
        key={item.label}
        className={`menu-item ${isActive ? "active" : ""}`}
        hoverClass="menu-item--pressed"
        onClick={() => handleMenuClick(item)}
      >
        <View className="menu-item__icon-wrap">
          <Icon
            name={item.icon}
            size={24}
            color={isActive ? "#6657D9" : "#8A96AA"}
            className="menu-item__icon"
          />
        </View>
        <Text className="menu-item__label">{item.label}</Text>
      </View>
    );
  };

  return (
    <View className="bottom-menu">
      {bottomMenu.map(renderTab)}
    </View>
  );
};

export default BottomMenu;
