import React from "react";
import { View, Text } from "@tarojs/components";

import "./index.less";
import HomeMenu from "../home-menu/homeMenu";

const HomeAbout = () => {
  return (
    <View class='home-about'>
      <HomeMenu title='关于我们'></HomeMenu>
      <Text style='font-size: 40rpx; padding-top: 40rpx;'>概况</Text>
      <View style='padding: 40rpx'>

      </View>
    </View>
  );
};

export default HomeAbout;
