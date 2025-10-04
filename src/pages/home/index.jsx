import React from "react";
import Taro from "@tarojs/taro";
import { View, Text } from "@tarojs/components";
import { AtButton } from "taro-ui";

import "taro-ui/dist/style/components/button.scss";
import "./index.less";

const quickActions = [
  {
    label: "立即填写问卷",
    desc: "进入最新问卷，快速完成测评",
    url: "/pages/questionsheet/index"
  },
  {
    label: "查看测评历史",
    desc: "回顾过往答卷与报告",
    url: "/pages/answersheetList/index"
  },
  {
    label: "管理受测者档案",
    desc: "完善信息以便精准评估",
    url: "/pages/register/index"
  }
];

const highlights = [
  {
    title: "医生的得力伙伴",
    items: ["已覆盖 600+ 家医院", "服务 2000+ 名医生", "平均减少 15% 跟诊工作量", "患者好评率 60%"]
  },
  {
    title: "患者的健康助手",
    items: ["累计服务 50000 名患者", "规范治疗率达到 80%", "治疗效率整体提升 40%", "化疗平均住院时间缩短 0.5 天"]
  }
];

const features = [
  {
    title: "问卷全流程闭环",
    desc: "支持问卷发放、受测者管理、答卷提交与报告查看"
  },
  {
    title: "精细化渠道追踪",
    desc: "自动解析渠道参数并沉淀埋点，帮助运营拉新留存"
  },
  {
    title: "安全可靠的文件上传",
    desc: "通过 OSS 签名上传与隐私授权，保证数据合规"
  }
];

const HomeIndex = () => {
  const handleNavigate = (url) => {
    Taro.navigateTo({ url });
  };

  return (
    <View className="home-page">
      <View className="home-page__hero">
        <Text className="home-page__title">问卷服务助手</Text>
        <Text className="home-page__subtitle">围绕医疗咨询场景打造的问卷管理与评估平台</Text>
        <View className="home-page__actions">
          {quickActions.map(({ label, desc, url }) => (
            <View key={label} className="home-action">
              <Text className="home-action__desc">{desc}</Text>
              <AtButton type="primary" onClick={() => handleNavigate(url)}>
                {label}
              </AtButton>
            </View>
          ))}
        </View>
      </View>

      <View className="home-page__section">
        <Text className="home-section__title">能力亮点</Text>
        <View className="home-section__grid">
          {features.map(({ title, desc }) => (
            <View key={title} className="home-card home-card--feature">
              <Text className="home-card__title">{title}</Text>
              <Text className="home-card__content">{desc}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className="home-page__section">
        <Text className="home-section__title">服务成效</Text>
        {highlights.map(({ title, items }) => (
          <View key={title} className="home-card home-card--highlight">
            <Text className="home-card__title">{title}</Text>
            <View className="home-card__list">
              {items.map((text) => (
                <Text key={text} className="home-card__item">{text}</Text>
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

export default HomeIndex;
