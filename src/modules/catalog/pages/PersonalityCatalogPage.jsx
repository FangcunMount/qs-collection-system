import React, { useMemo, useState, useEffect } from "react";
import Taro from "@tarojs/taro";
import { View, Text, ScrollView, Image } from "@tarojs/components";
import { AtIcon } from "taro-ui";

import { PrivacyAuthorization } from "@/shared/ui/PrivacyAuthorization";
import { routes } from "@/shared/config/routes";
import { PERSONALITY_CATALOG_ITEMS } from "@/shared/config/personalityModels";
import heroImage from "@/assets/home/home-entry-personality.png";
import typeBasicImage from "@/assets/icon/icon-personality-basic.png";
import typeChatImage from "@/assets/icon/icon-ie-test.png";
import funTestImage from "@/assets/icon/icon-sbti.png";
import reportImage from "@/assets/icon/icon-learning-performance.png";
import starImage from "@/assets/icon/icon_small.png";
import relationImage from "@/assets/icon/icon-emotional-regulation.png";
import growthImage from "@/assets/icon/icon-behavior-ability.png";
import "./PersonalityCatalogPage.less";

const TYPE_LIBRARY = Object.freeze([
  {
    code: "INTJ",
    name: "建筑师",
    desc: "独立思考，擅长规划，追求完善与秩序。",
    tag: "理性 · 战略型",
    tone: "violet",
  },
  {
    code: "ENFP",
    name: "竞选者",
    desc: "热情开朗，富有创意，追求可能性。",
    tag: "灵感 · 社交型",
    tone: "green",
  },
  {
    code: "ISFJ",
    name: "守卫者",
    desc: "温和细心，乐于奉献，重视稳定与和谐。",
    tag: "守护 · 细致型",
    tone: "blue",
  },
  {
    code: "ENTP",
    name: "辩论家",
    desc: "思维敏捷，喜欢挑战，追求创新与突破。",
    tag: "创新 · 挑战型",
    tone: "pink",
  },
]);

const INTERPRET_SERVICES = Object.freeze([
  { title: "专业报告解读", subtitle: "深度剖析性格特征", image: reportImage },
  { title: "优势潜能分析", subtitle: "发现你的核心优势", image: starImage },
  { title: "关系模式解读", subtitle: "理解人际互动方式", image: relationImage },
  { title: "成长建议", subtitle: "提供个性化建议", image: growthImage },
]);

const resolveHeaderMetrics = () => {
  try {
    const systemInfo = Taro.getSystemInfoSync?.() || {};
    return {
      statusBarHeight: systemInfo.statusBarHeight || 0,
    };
  } catch (error) {
    console.warn("[PersonalityCatalogPage] 获取状态栏高度失败:", error);
    return { statusBarHeight: 0 };
  }
};

const findCatalogItem = (key) => (
  PERSONALITY_CATALOG_ITEMS.find((item) => item.key === key) || null
);

const PersonalityCatalogPage = () => {
  const [navMetrics, setNavMetrics] = useState(() => resolveHeaderMetrics());
  const type16Item = useMemo(() => findCatalogItem("mbti"), []);
  const funItem = useMemo(() => findCatalogItem("sbti"), []);

  useEffect(() => {
    setNavMetrics(resolveHeaderMetrics());
  }, []);

  const handleBack = () => {
    const pages = Taro.getCurrentPages?.() || [];
    if (pages.length > 1) {
      Taro.navigateBack();
      return;
    }
    Taro.switchTab({ url: routes.tabHome() });
  };

  const handleOpenModel = (item) => {
    if (!item) return;
    Taro.navigateTo({ url: routes.personalityModel({ model: item.key }) });
  };

  const handleComingSoon = () => {
    Taro.showToast({ title: "该测评即将开放", icon: "none" });
  };

  const handleViewAllTypes = () => {
    handleOpenModel(type16Item);
  };

  return (
    <View className="personality-home">
      <ScrollView scrollY className="personality-home__scroll" enhanced showScrollbar={false}>
        <View
          className="personality-nav"
          style={{ paddingTop: `${navMetrics.statusBarHeight}px` }}
        >
          <View className="personality-nav__back" onClick={handleBack}>
            <AtIcon value="chevron-left" size="26" color="#071735" />
          </View>
          <Text className="personality-nav__title">人格探索</Text>
          <View className="personality-nav__spacer" />
        </View>

        <View className="personality-hero">
          <View className="personality-hero__content">
            <View className="personality-hero__eyes">
              <View className="personality-hero__eye" />
              <View className="personality-hero__eye" />
            </View>
            <Text className="personality-hero__title">测测你的人格类型</Text>
            <Text className="personality-hero__subtitle">探索真实的自己，发现独特的天赋与潜能</Text>
            <Text className="personality-hero__label">PERSONALITY TEST</Text>
          </View>
          <Image className="personality-hero__image" src={heroImage} mode="aspectFit" />
          <View className="personality-hero__spark personality-hero__spark--one" />
          <View className="personality-hero__spark personality-hero__spark--two" />
          <View className="personality-hero__spark personality-hero__spark--three" />
        </View>

        <View className="personality-feature-card" onClick={() => handleOpenModel(type16Item)}>
          <View className="personality-feature-card__content">
            <Text className="personality-feature-card__kicker">正式探索 · 16 类型</Text>
            <Text className="personality-feature-card__title">16 型人格测评</Text>
            <Text className="personality-feature-card__desc">
              从四组性格偏好出发，了解你的行为方式与沟通习惯。
            </Text>
            <View className="personality-feature-card__meta-row">
              <Text className="personality-feature-card__meta">约 {type16Item?.durationMin || 15} 分钟</Text>
              <Text className="personality-feature-card__meta">{type16Item?.questionCount || 93} 道题</Text>
              <Text className="personality-feature-card__meta">100w+ 已测</Text>
            </View>
          </View>
          <View className="personality-feature-card__icon">
            <Image className="personality-feature-card__image" src={typeBasicImage} mode="aspectFit" />
          </View>
          <View className="personality-feature-card__arrow">
            <AtIcon value="chevron-right" size="20" color="#FFFFFF" />
          </View>
        </View>

        <View className="personality-mini-grid">
          <View
            className="personality-mini-card personality-mini-card--fun"
            onClick={() => handleOpenModel(funItem)}
          >
            <Text className="personality-mini-card__kicker">趣味探索 · 快速了解</Text>
            <Text className="personality-mini-card__title">今日趣味人格小测试</Text>
            <Text className="personality-mini-card__desc">轻松有趣，快速了解你的趣味倾向。</Text>
            <View className="personality-mini-card__button">
              <Text>开始测试</Text>
              <AtIcon value="arrow-right" size="13" color="#0CA66A" />
            </View>
            <Image className="personality-mini-card__image" src={funTestImage} mode="aspectFit" />
          </View>

          <View
            className="personality-mini-card personality-mini-card--deep"
            onClick={handleComingSoon}
          >
            <Text className="personality-mini-card__kicker">深度探索 · 多维解读</Text>
            <Text className="personality-mini-card__title">九型人格测评</Text>
            <Text className="personality-mini-card__desc">探索你的核心动机，发现内在成长方向。</Text>
            <View className="personality-mini-card__button">
              <Text>即将开放</Text>
              <AtIcon value="arrow-right" size="13" color="#7656D9" />
            </View>
            <Text className="personality-mini-card__number">9</Text>
          </View>
        </View>

        <View className="personality-section">
          <View className="personality-section__header">
            <Text className="personality-section__title">类型探索库</Text>
            <View className="personality-section__more" onClick={handleViewAllTypes}>
              <Text>查看全部</Text>
              <AtIcon value="chevron-right" size="14" color="#8A96AA" />
            </View>
          </View>
          <ScrollView scrollX className="personality-type-scroll" enhanced showScrollbar={false}>
            <View className="personality-type-track">
              {TYPE_LIBRARY.map((type) => (
                <View
                  key={type.code}
                  className={`personality-type-card personality-type-card--${type.tone}`}
                  onClick={handleViewAllTypes}
                >
                  <Text className="personality-type-card__code">{type.code}</Text>
                  <Text className="personality-type-card__name">{type.name}</Text>
                  <View className="personality-type-card__icon">
                    <Image className="personality-type-card__image" src={typeChatImage} mode="aspectFit" />
                  </View>
                  <Text className="personality-type-card__desc">{type.desc}</Text>
                  <Text className="personality-type-card__tag">{type.tag}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
          <View className="personality-dots">
            <View className="personality-dot personality-dot--active" />
            <View className="personality-dot" />
            <View className="personality-dot" />
            <View className="personality-dot" />
          </View>
        </View>

        <View className="personality-section personality-service-section">
          <Text className="personality-section__title">个性化解读服务</Text>
          <View className="personality-service-grid">
            {INTERPRET_SERVICES.map((service) => (
              <View key={service.title} className="personality-service-card" onClick={handleComingSoon}>
                <View className="personality-service-card__icon">
                  <Image className="personality-service-card__image" src={service.image} mode="aspectFit" />
                </View>
                <View className="personality-service-card__text">
                  <Text className="personality-service-card__title">{service.title}</Text>
                  <Text className="personality-service-card__subtitle">{service.subtitle}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View className="personality-home__note">
          <Text>16 型人格用于自我探索与沟通参考；趣味测评仅用于娱乐分享，不代表真实心理状态。</Text>
        </View>

        <View className="personality-home__bottom-spacer" />
      </ScrollView>

      <PrivacyAuthorization />
    </View>
  );
};

export default PersonalityCatalogPage;
