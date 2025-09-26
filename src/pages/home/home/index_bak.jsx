import React from "react";
import { View, Image, Text } from "@tarojs/components";

import HomeMenu from "../home-menu/homeMenu"; 
import "./index.less"

const Home = () => {
  return (
    <View style='display: flex; flex-direction: column; align-items: center; height: 100vh;'>
      <HomeMenu title='首页'></HomeMenu>
      <Text class='home-title'>专业的疾病管理服务平台</Text>
      <Image
        src='https://img.fangcunyisheng.com/v5/page/www/mindex/images/index_11.png'
        mode='aspectFit'
        style='width: 400rpx; height: 40rpx; flex-grow: 0;'
      ></Image>
      <View style='flex-grow: 1;'></View>
      <Image
        src='https://img.fangcunyisheng.com/v5/page/www/mindex/images/index_1.png'
        mode='aspectFit'
        style='width: 750rpx; height: 750rpx'
      ></Image>
    </View>
  );
};

export default Home;