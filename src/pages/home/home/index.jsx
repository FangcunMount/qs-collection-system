import React from "react";
import Taro from "@tarojs/taro";
import { AtButton } from 'taro-ui'
import { View, Image, Text } from "@tarojs/components";

import HomeMenu from "../home-menu/homeMenu"; 
import "./index.less"

const Home = () => {

  const jumpToAnswersheetList = () => {
    Taro.navigateTo({
      url: `/pages/answersheetList/index`
    });
  }

  return (
    <View className="home-container">
      <View style='position:absolute ; bottom: 20%'>
        <AtButton  onClick={ jumpToAnswersheetList.bind(this) }>
          查看测评历史
        </AtButton>
      </View>
    </View>
  );
};

export default Home;
