import React from "react";
import { View, Text } from "@tarojs/components";

import "./index.less"
import HomeMenu from "../home-menu/homeMenu";

const HomeDoctor = () => {
  return (
    <View class='home-doctor'>
      <HomeMenu title='医生'></HomeMenu>
      <Text class='home-title'>医生的得力伙伴</Text>
      <Text style='font-size: 32rpx; color: #666; margin-bottom: 40rpx; '>
        专业的疾病管理服务平台
      </Text>
      <Text class='home-doctor-row'>
        <Text>已成功为</Text>
        <Text style='color: #ff7800'>600</Text>
        <Text>多家医院的</Text>
        <Text style='color: #ff7800'>2000</Text>
        <Text>多名医生</Text>
      </Text>
      <Text class='home-doctor-row'>
        <Text>管理了近</Text>
        <Text style='color: #ff7800'>50000</Text>
        <Text>名患者</Text>
      </Text>
      <Text class='home-doctor-row'>
        <Text>帮助医生减少</Text>
        <Text style='color: #ff7800'>15%</Text>
        <Text>工作量</Text>
      </Text>
      <Text class='home-doctor-row'>
        <Text>大幅提升患者</Text>
        <Text style='color: #ff7800'>依从性</Text>
      </Text>
      <Text class='home-doctor-row'>
        <Text>患者好评率高达</Text>
        <Text style='color: #ff7800'>60%</Text>
      </Text>
    </View>
  );
};

export default HomeDoctor;
