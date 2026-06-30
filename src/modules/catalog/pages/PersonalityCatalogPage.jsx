import React, { useEffect, useMemo, useState } from "react";
import Taro from "@tarojs/taro";
import { View, Text, ScrollView, Image } from "@tarojs/components";
import { AtIcon } from "taro-ui";

import { PrivacyAuthorization } from "@/shared/ui/PrivacyAuthorization";
import { routes } from "@/shared/config/routes";
import { loadGroupedPersonalityCatalog } from "@/modules/catalog/services/personalityCatalogService";
import {
  buildDeepExploreDisplayItems,
  partitionPersonalityCatalog,
} from "@/modules/catalog/lib/personalityCatalog";
import AssessmentKindReportSection from "@/modules/assessment/components/records/AssessmentKindReportSection";
import { ASSESSMENT_KIND } from "@/shared/lib/assessmentKind";
import heroImage from "@/assets/home/home-entry-personality.png";
import typeBasicImage from "@/pages/catalog-personality/assets/icon/icon-personality-basic.png";
import reportImage from "@/pages/catalog-personality/assets/icon/icon-learning-performance.png";
import starImage from "@/pages/catalog-personality/assets/icon/icon_small.png";
import relationImage from "@/pages/catalog-personality/assets/icon/icon-emotional-regulation.png";
import growthImage from "@/pages/catalog-personality/assets/icon/icon-behavior-ability.png";
import "./PersonalityCatalogPage.less";

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

const PersonalityCatalogPage = () => {
  const [navMetrics, setNavMetrics] = useState(() => resolveHeaderMetrics());
  const [catalogItems, setCatalogItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const { featuredItem, secondaryItems, deepExploreItems } = useMemo(() => {
    const partitioned = partitionPersonalityCatalog(catalogItems);
    return {
      featuredItem: partitioned.featuredItem,
      secondaryItems: partitioned.secondaryItems,
      deepExploreItems: buildDeepExploreDisplayItems(catalogItems),
    };
  }, [catalogItems]);

  useEffect(() => {
    setNavMetrics(resolveHeaderMetrics());
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadCatalog = async () => {
      setLoading(true);
      setLoadError("");

      try {
        const result = await loadGroupedPersonalityCatalog({
          page: 1,
          pageSize: 50,
          category: "personality",
        });

        if (cancelled) return;

        setCatalogItems(result.catalogItems || []);
        if (!result.catalogItems?.length) {
          setLoadError("暂无可用人格测评，请稍后再试");
        }
      } catch (error) {
        if (cancelled) return;
        console.warn("[PersonalityCatalogPage] 加载人格模型目录失败", error);
        setCatalogItems([]);
        setLoadError("人格测评目录加载失败，请检查网络后重试");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadCatalog();
    return () => {
      cancelled = true;
    };
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
    if (!item?.modelCode) return;
    Taro.navigateTo({ url: routes.personalityModel({ model: item.key, model_code: item.modelCode }) });
  };

  const handleComingSoon = () => {
    Taro.showToast({ title: "该服务即将开放", icon: "none" });
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

        {loadError ? (
          <View className="personality-home__notice">
            <Text>{loadError}</Text>
          </View>
        ) : null}

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

        {loading ? (
          <View className="personality-home__notice">
            <Text>正在加载人格测评目录...</Text>
          </View>
        ) : null}

        {!loading && featuredItem ? (
          <View className="personality-feature-card" onClick={() => handleOpenModel(featuredItem)}>
            <View className="personality-feature-card__content">
              <Text className="personality-feature-card__kicker">
                {featuredItem.hero?.kicker || featuredItem.badge || "人格探索"}
              </Text>
              <Text className="personality-feature-card__title">{featuredItem.title}</Text>
              <Text className="personality-feature-card__desc">
                {featuredItem.description || "从四组性格偏好出发，了解你的行为方式与沟通习惯。"}
              </Text>
              <View className="personality-feature-card__meta-row">
                {featuredItem.variantHint ? (
                  <Text className="personality-feature-card__meta">{featuredItem.variantHint}</Text>
                ) : null}
                {featuredItem.questionCount ? (
                  <Text className="personality-feature-card__meta">{featuredItem.questionCount} 道题</Text>
                ) : null}
                {featuredItem.durationMin ? (
                  <Text className="personality-feature-card__meta">约 {featuredItem.durationMin} 分钟起</Text>
                ) : null}
                <Text className="personality-feature-card__meta">已发布</Text>
              </View>
            </View>
            <View className="personality-feature-card__icon">
              <Image className="personality-feature-card__image" src={typeBasicImage} mode="aspectFit" />
            </View>
            <View className="personality-feature-card__arrow">
              <AtIcon value="chevron-right" size="20" color="#FFFFFF" />
            </View>
          </View>
        ) : null}

        {!loading ? (
          <View className="personality-mini-grid">
            {secondaryItems.map((item) => (
              <View
                key={item.key}
                className={`personality-mini-card personality-mini-card--${item.theme || "default"}`}
                onClick={() => handleOpenModel(item)}
              >
                <Text className="personality-mini-card__kicker">
                  {item.badge || "人格探索"}
                </Text>
                <Text className="personality-mini-card__title">{item.title}</Text>
                <Text className="personality-mini-card__desc">{item.description}</Text>
                <View className="personality-mini-card__button">
                  <Text>{item.cta || "开始测试"}</Text>
                  <AtIcon value="arrow-right" size="13" color="#7656D9" />
                </View>
              </View>
            ))}

            {deepExploreItems.length ? (
              <View className="personality-mini-row">
                {deepExploreItems.map((item) => (
                  <View
                    key={item.key}
                    className={`personality-mini-card personality-mini-card--compact personality-mini-card--${item.theme}`}
                    onClick={() => handleOpenModel(item)}
                  >
                    <Text className="personality-mini-card__kicker">{item.badge || "深度探索"}</Text>
                    <Text className="personality-mini-card__title">{item.title}</Text>
                    <Text className="personality-mini-card__desc">{item.description}</Text>
                    <View className="personality-mini-card__button">
                      <Text>{item.cta || "开始测试"}</Text>
                      <AtIcon
                        value="arrow-right"
                        size="13"
                        color={item.theme === "ocean" ? "#2B7DE9" : "#7656D9"}
                      />
                    </View>
                    {item.cardBadge ? (
                      <Text className="personality-mini-card__number">{item.cardBadge}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        <AssessmentKindReportSection
          kind={ASSESSMENT_KIND.PERSONALITY}
          title="人格测评报告"
          subtitle="最近完成的人格探索结果"
          emptyText="暂无人格探索报告，完成测评后将在这里展示。"
          tone="personality"
        />

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
