import React, { useCallback, useEffect, useState } from "react";
import Taro from "@tarojs/taro";
import { View, Text, ScrollView, Image } from "@tarojs/components";
import { AtIcon } from "taro-ui";

import BottomMenu from "@/shared/ui/BottomMenu";
import { routes } from "@/shared/config/routes";
import {
  ABILITY_DIRECTIONS,
  ABILITY_SPECIALIZED_ASSESSMENTS,
  isAbilityAssessmentAvailable,
} from "@/shared/config/abilityAssessments";
import heroImage from "@/assets/home/home-entry-behavior.png";
import executiveImage from "@/assets/icon/icon-executive-function.png";
import regulationImage from "@/assets/icon/icon-behavior-regulation.png";
import learningImage from "@/assets/icon/icon-learning-performance.png";
import familyImage from "@/assets/icon/icon-family-observation.png";
import abilityImage from "@/assets/icon/icon-behavior-ability.png";
import "./AbilityCatalogPage.less";

const DIRECTION_IMAGES = {
  executive: executiveImage,
  regulation: regulationImage,
  learning: learningImage,
  family: familyImage,
};

const ASSESSMENT_IMAGES = {
  executive: executiveImage,
  regulation: regulationImage,
  learning: learningImage,
  family: familyImage,
};

const resolveHeaderMetrics = () => {
  try {
    const systemInfo = Taro.getSystemInfoSync?.() || {};
    return {
      statusBarHeight: systemInfo.statusBarHeight || 0,
    };
  } catch (error) {
    console.warn("[AbilityCatalogPage] 获取状态栏高度失败:", error);
    return { statusBarHeight: 0 };
  }
};

const AbilityCatalogPage = () => {
  const [navMetrics, setNavMetrics] = useState(() => resolveHeaderMetrics());
  const [scrollTarget, setScrollTarget] = useState("");

  useEffect(() => {
    setNavMetrics(resolveHeaderMetrics());
  }, []);

  const handleBack = useCallback(() => {
    const pages = Taro.getCurrentPages?.() || [];
    if (pages.length > 1) {
      Taro.navigateBack();
      return;
    }
    Taro.switchTab({ url: routes.tabHome() });
  }, []);

  const handleViewAssessments = useCallback(() => {
    setScrollTarget("ability-specialized");
    setTimeout(() => setScrollTarget(""), 300);
  }, []);

  const handleOpenAssessment = useCallback((item) => {
    if (!isAbilityAssessmentAvailable(item)) {
      Taro.showToast({
        title: item.statusLabel || "即将开放",
        icon: "none",
      });
      return;
    }

    Taro.navigateTo({
      url: routes.assessmentFill({ q: item.scaleCode }),
    });
  }, []);

  return (
    <View className="ability-catalog">
      <ScrollView
        scrollY
        scrollIntoView={scrollTarget}
        className="ability-catalog__scroll"
        enhanced
        showScrollbar={false}
      >
        <View
          className="ability-nav"
          style={{ paddingTop: `${navMetrics.statusBarHeight}px` }}
        >
          <View className="ability-nav__back" onClick={handleBack}>
            <AtIcon value="chevron-left" size="26" color="#071735" />
          </View>
          <Text className="ability-nav__title">行为能力</Text>
          <View className="ability-nav__spacer" />
        </View>

        <View className="ability-hero">
          <View className="ability-hero__content">
            <Text className="ability-hero__title">看见行为背后的{"\n"}能力线索</Text>
            <Text className="ability-hero__subtitle">
              面向儿童、青少年与家庭场景，聚焦执行功能、行为表现与成长支持。
            </Text>
            <View className="ability-hero__action" onClick={handleViewAssessments}>
              <Text>查看可用测评</Text>
              <AtIcon value="chevron-right" size="14" color="#FFFFFF" />
            </View>
          </View>
          <Image className="ability-hero__image" src={heroImage} mode="aspectFit" />
          <View className="ability-hero__orb ability-hero__orb--one" />
          <View className="ability-hero__orb ability-hero__orb--two" />
          <View className="ability-hero__orb ability-hero__orb--three" />
        </View>

        <View className="ability-panel">
          <View className="ability-section__header">
            <Text className="ability-section__title">能力方向</Text>
            <View className="ability-section__more">
              <Text>持续扩展中</Text>
              <AtIcon value="chevron-right" size="14" color="#8A96AA" />
            </View>
          </View>

          <View className="ability-direction-grid">
            {ABILITY_DIRECTIONS.map((direction) => (
              <View
                key={direction.key}
                className={`ability-direction-card ability-direction-card--${direction.tone}`}
              >
                <Image
                  className="ability-direction-card__image"
                  src={DIRECTION_IMAGES[direction.key] || abilityImage}
                  mode="aspectFit"
                />
                <View className="ability-direction-card__body">
                  <Text className="ability-direction-card__title">{direction.title}</Text>
                  <Text className="ability-direction-card__desc">
                    {direction.detail || direction.subtitle}
                  </Text>
                  <Text className="ability-direction-card__count">
                    {direction.assessmentCount || 0} 个测评
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View id="ability-specialized" className="ability-specialized">
            <View className="ability-section__header">
              <Text className="ability-section__title">热门测评</Text>
              <View className="ability-section__more" onClick={handleViewAssessments}>
                <Text>更多测评</Text>
                <AtIcon value="chevron-right" size="14" color="#8A96AA" />
              </View>
            </View>

            <View className="ability-assessment-list">
              {ABILITY_SPECIALIZED_ASSESSMENTS.map((item) => (
                <View
                  key={item.key}
                  className={`ability-assessment-row ${isAbilityAssessmentAvailable(item) ? "" : "is-disabled"}`}
                  onClick={() => handleOpenAssessment(item)}
                >
                  <Image
                    className="ability-assessment-row__image"
                    src={ASSESSMENT_IMAGES[item.iconKey] || abilityImage}
                    mode="aspectFit"
                  />
                  <View className="ability-assessment-row__content">
                    <View className="ability-assessment-row__title-line">
                      <Text className="ability-assessment-row__title">{item.title}</Text>
                      <Text className="ability-assessment-row__badge">{item.statusLabel}</Text>
                    </View>
                    <Text className="ability-assessment-row__desc">{item.description}</Text>
                  </View>
                  <View className="ability-assessment-row__meta">
                    <Text className="ability-assessment-row__duration">{item.duration || "约 10 分钟"}</Text>
                    <Text className="ability-assessment-row__tested">{item.testedLabel || "持续扩展中"}</Text>
                  </View>
                  <AtIcon value="chevron-right" size="18" color="#9AA6B8" />
                </View>
              ))}
            </View>
          </View>
        </View>

        <View className="ability-trust-card">
          <View className="ability-trust-card__icon">
            <AtIcon value="check" size="22" color="#FFFFFF" />
          </View>
          <View className="ability-trust-card__content">
            <Text className="ability-trust-card__title">科学评估 · 权威工具 · 隐私安全</Text>
            <Text className="ability-trust-card__desc">
              所有测评均来自权威来源，结果仅供参考
            </Text>
          </View>
          <Image className="ability-trust-card__image" src={abilityImage} mode="aspectFit" />
        </View>

        <View className="ability-catalog__bottom-spacer" />
      </ScrollView>

      <BottomMenu activeKey="首页" />
    </View>
  );
};

export default AbilityCatalogPage;
