import React, { useCallback, useEffect, useMemo, useState } from "react";
import Taro from "@tarojs/taro";
import { View, Text, Image } from "@tarojs/components";
import { AtIcon } from "taro-ui";

import { PrivacyAuthorization } from "@/shared/ui/PrivacyAuthorization";
import AppNavigationBar from "@/shared/ui/AppNavigationBar";
import PageShell from "@/shared/ui/PageShell";
import SectionHeader from "@/shared/ui/SectionHeader";
import StatePanel from "@/shared/ui/StatePanel";
import SurfaceCard from "@/shared/ui/SurfaceCard";
import { routes } from "@/shared/config/routes";
import { loadGroupedPersonalityCatalog } from "@/modules/catalog/services/personalityCatalogService";
import {
  buildDeepExploreDisplayItems,
  partitionPersonalityCatalog,
} from "@/modules/catalog/lib/personalityCatalog";
import AssessmentKindReportSection from "@/modules/assessment/components/records/AssessmentKindReportSection";
import { ASSESSMENT_KIND } from "@/shared/lib/assessmentKind";
import {
  mapPersonalityCatalogCard,
  type CatalogCardViewModel,
} from "@/modules/catalog/viewModels/catalogCard";
import heroImage from "@/assets/home/home-entry-personality.png";
import typeBasicImage from "@/pages/catalog-personality/assets/icon/icon-personality-basic.png";
import funTestImage from "@/pages/catalog-personality/assets/icon/icon-sbti.png";
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

const resolveMiniCardButtonColor = (theme: string) => {
  if (theme === "fun") return "#0CA66A";
  if (theme === "ocean") return "#2B7DE9";
  return "#7656D9";
};

const PersonalityCatalogPage = () => {
  const [catalogItems, setCatalogItems] = useState<CatalogCardViewModel[]>([]);
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

  const loadCatalog = useCallback(async () => {
      setLoading(true);
      setLoadError("");

      try {
        const result = await loadGroupedPersonalityCatalog({
          page: 1,
          pageSize: 50,
          category: "personality",
        });

        const items: unknown[] = Array.isArray(result.catalogItems) ? result.catalogItems : [];
        setCatalogItems(items.map(mapPersonalityCatalogCard));
      } catch (error) {
        console.warn("[PersonalityCatalogPage] 加载人格模型目录失败", error);
        setCatalogItems([]);
        setLoadError("人格测评目录加载失败，请检查网络后重试");
      } finally {
        setLoading(false);
      }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const handleBack = () => {
    const pages = Taro.getCurrentPages?.() || [];
    if (pages.length > 1) {
      Taro.navigateBack();
      return;
    }
    Taro.switchTab({ url: routes.tabHome() });
  };

  const handleOpenModel = (item: CatalogCardViewModel) => {
    if (!item?.modelCode) return;
    Taro.navigateTo({ url: routes.personalityModel({ model: item.key, model_code: item.modelCode }) });
  };

  const handleComingSoon = () => {
    Taro.showToast({ title: "该服务即将开放", icon: "none" });
  };

  return (
    <PageShell
      tone="personality"
      className="personality-home"
      contentClassName="personality-home__scroll"
      navigation={(
        <AppNavigationBar title="人格探索" showBack onBack={handleBack} tone="personality" transparent />
      )}
    >

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
          <StatePanel state="loading" title="正在加载人格测评目录" tone="personality" compact />
        ) : loadError ? (
          <StatePanel
            state="error"
            title="人格测评目录加载失败"
            description={loadError}
            actionText="重新加载"
            onAction={loadCatalog}
            tone="personality"
            compact
          />
        ) : !catalogItems.length ? (
          <StatePanel
            state="empty"
            title="暂无可用人格测评"
            description="已发布模型将在这里展示。"
            tone="personality"
            compact
          />
        ) : null}

        {!loading && featuredItem ? (
          <SurfaceCard className="personality-feature-card" onClick={() => handleOpenModel(featuredItem)}>
            <View className="personality-feature-card__content">
              <Text className="personality-feature-card__kicker">
                {featuredItem.hero?.kicker || featuredItem.badge || "人格探索"}
              </Text>
              <Text className="personality-feature-card__title">{featuredItem.title}</Text>
              <Text className="personality-feature-card__desc">
                {featuredItem.description || featuredItem.subtitle || ""}
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
          </SurfaceCard>
        ) : null}

        {!loading ? (
          <View className="personality-mini-grid">
            {secondaryItems.map((item) => (
              <SurfaceCard
                key={item.key}
                className={`personality-mini-card personality-mini-card--${item.theme || "deep"}`}
                onClick={() => handleOpenModel(item)}
              >
                <Text className="personality-mini-card__kicker">
                  {item.badge || "人格探索"}
                </Text>
                <Text className="personality-mini-card__title">{item.title}</Text>
                <Text className="personality-mini-card__desc">{item.description}</Text>
                <View className="personality-mini-card__button">
                  <Text>{item.cta || "开始测试"}</Text>
                  <AtIcon value="arrow-right" size="13" color={resolveMiniCardButtonColor(item.theme)} />
                </View>
                {item.theme === "fun" ? (
                  <Image className="personality-mini-card__image" src={funTestImage} mode="aspectFit" />
                ) : null}
              </SurfaceCard>
            ))}

            {deepExploreItems.length ? (
              <View className="personality-mini-row">
                {deepExploreItems.map((item) => (
                  <SurfaceCard
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
                        color={resolveMiniCardButtonColor(item.theme)}
                      />
                    </View>
                  </SurfaceCard>
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
          <SectionHeader title="个性化解读服务" tone="personality" />
          <View className="personality-service-grid">
            {INTERPRET_SERVICES.map((service) => (
              <SurfaceCard key={service.title} className="personality-service-card" onClick={handleComingSoon}>
                <View className="personality-service-card__icon">
                  <Image className="personality-service-card__image" src={service.image} mode="aspectFit" />
                </View>
                <View className="personality-service-card__text">
                  <Text className="personality-service-card__title">{service.title}</Text>
                  <Text className="personality-service-card__subtitle">{service.subtitle}</Text>
                </View>
              </SurfaceCard>
            ))}
          </View>
        </View>

        <View className="personality-home__note">
          <Text>16 型人格用于自我探索与沟通参考；趣味测评仅用于娱乐分享，不代表真实心理状态。</Text>
        </View>

        <View className="personality-home__bottom-spacer" />
      <PrivacyAuthorization />
    </PageShell>
  );
};

export default PersonalityCatalogPage;
