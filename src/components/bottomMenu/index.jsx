import React from "react";
import { View, Text } from "@tarojs/components";
import { AtIcon } from "taro-ui";
import Taro from "@tarojs/taro";
import "taro-ui/dist/style/components/icon.scss";

const bottomMenu = [
  { label: "首页", icon: "home", url: "/pages/home/index/index" },
  { label: "发现", icon: "search", url: "/pages/questionnaire/list/index" },
  { label: "历史", icon: "clock", url: "/pages/answersheet/list/index" },
  { label: "我的", icon: "user", url: "/pages/user/profile/index" }
];

const BottomMenu = ({ activeKey }) => {
  const handleMenuClick = (item) => {
    if (item.url) {
      const currentPath = Taro.getCurrentInstance().router.path;
      if (currentPath !== item.url) {
        Taro.redirectTo({ url: item.url });
      }
    }
  };

  return (
    <View className="bottom-menu">
      {bottomMenu.map((item) => (
        <View 
          key={item.label}
          className={`menu-item ${item.label === activeKey ? 'active' : ''}`}
          onClick={() => handleMenuClick(item)}
        >
          <AtIcon 
            value={item.icon} 
            size="24" 
            color={item.label === activeKey ? "#1890FF" : "#595959"}
            className="menu-item__icon" 
          />
          <Text className="menu-item__label">{item.label}</Text>
        </View>
      ))}
    </View>
  );
};

export default BottomMenu;
