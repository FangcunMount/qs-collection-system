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
        <View style='margin-bottom: 16rpx'>
          方寸医生成立于2015年3月，是国内垂直疾病患者管理领先的互联网医疗公司，先后获得了凯风、顺为、新浪等著名VC的多轮投资。创始团队均源自百度、好大夫、奇虎等一线互联网公司，我们的服务医生全部来自北京、上海、广东的一线三甲医院。
        </View>

        <View style='margin-bottom: 16rpx'>
          经过5年的快速发展, 公司在疾病管理领域积累大量经验和医疗数据,
          构建了一个行业领先的疾病管理和疾病大数据体系。在 ADHD 领域，公司已成为行业领导者，已拥有超过40%的市场份额。
        </View>

        <View>
          通过为上千名医生和数万名慢病患者提供优质疾病管理服务,
          获得了良好的行业口碑。同时,
          公司正和礼来等国际制药企业展开深度合作。被中国医药教育协会授予患者诊后管理示范中心称号。
        </View>
      </View>
    </View>
  );
};

export default HomeAbout;
