import React from "react";
import { View, Text } from "@tarojs/components";

import "./index.less";
import HomeMenu from "../home-menu/homeMenu";

const HomePatient = () => {
  return (
    <View class='home-patient'>
      <HomeMenu title='患者'></HomeMenu>
      <Text class='home-title'>您身边的医疗服务专家</Text>
      <Text style='font-size: 32rpx; color: #666; margin-bottom: 40rpx; '>
        专业的诊后管理服务
      </Text>

      <Text class='home-patient-row'>
        <Text>已为</Text>
        <Text style='color: #ff7800'>50000</Text>
        <Text>名患者提供了诊后医疗服务</Text>
      </Text>

      <Text class='home-patient-row'>
        <Text>规范治疗率高达</Text>
        <Text style='color: #ff7800'>80%</Text>
      </Text>

      <Text class='home-patient-row'>
        <Text>治疗效率提升</Text>
        <Text style='color: #ff7800'>40%</Text>
      </Text>

      <Text class='home-patient-row'>
        <Text>化疗住院时间缩短</Text>
        <Text style='color: #ff7800'>0.5</Text>
        <Text>天</Text>
      </Text>
    </View>
  );
};

export default HomePatient;
