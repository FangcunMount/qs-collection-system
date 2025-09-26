import React, { useState, useEffect } from "react";
import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";

import "./homeMenu.less";
import { getLogger } from "../../../util/log";

const PAGE_NAME = "home";
const logger = getLogger(PAGE_NAME);

const menus = [
  {
    title: "首页",
    url: "/pages/home/home/index"
  },
  {
    title: "医生",
    url: "/pages/home/doctor/index"
  },
  {
    title: "患者",
    url: "/pages/home/patient/index"
  },
  {
    title: "关于我们",
    url: "/pages/home/about/index"
  }
];

const HomeMenu = props => {
  const { title } = props;
  const [menuFlag, setMenuFlag] = useState(false);

  useEffect(() => {
    logger.RUN("did effect <RUN> | home menu");
  });

  const handleToPage = url => {
    logger.RUN("handleToPage <RUN> | params: ", { url });
    Taro.redirectTo({ url });
  };

  const getMenuBtn = () => {
    if (menuFlag) {
      return (
        <View
          class="icon-close"
          onClick={() => {
            setMenuFlag(false);
          }}
        >
          <View class="icon-close-line icon-close-line-one"></View>
          <View class="icon-close-line icon-close-line-two"></View>
        </View>
      );
    } else {
      return (
        <View
          class="icon-menu"
          onClick={() => {
            setMenuFlag(true);
          }}
        >
          <View class="icon-line"></View>
          <View class="icon-line"></View>
          <View class="icon-line"></View>
        </View>
      );
    }
  };
  return (
    <View class="home-header">
      {getMenuBtn()}
      <Text>{title}</Text>

      <View
        class="menu"
        style={{
          height: menuFlag ? "calc(100vh - 80rpx)" : "0",
          padding: menuFlag ? "" : "0"
        }}
      >
        {menus.map(v => {
          return (
            <View
              key={v.title}
              class="menu-item"
              onClick={() => {
                handleToPage(v.url);
              }}
            >
              {v.title}
            </View>
          );
        })}
      </View>
    </View>
  );
};

export default HomeMenu;
