import React, { useCallback, useEffect, useMemo, useState } from "react";
import Taro from "@tarojs/taro";
import { View, Text, Image } from "@tarojs/components";
import Icon from "@/shared/ui/Icon";

import { PrivacyAuthorization } from "@/shared/ui/PrivacyAuthorization";
import AppNavigationBar from "@/shared/ui/AppNavigationBar";
import PageShell from "@/shared/ui/PageShell";
import SectionHeader from "@/shared/ui/SectionHeader";
import StatePanel from "@/shared/ui/StatePanel";
import SurfaceCard from "@/shared/ui/SurfaceCard";
import { routes } from "@/shared/config/routes";
import { loadGroupedPersonalityCatalog } from "@/modules/catalog/services/personalityCatalogService";
import { selectPersonalityLandingItems } from "@/modules/catalog/lib/personalityCatalog";
import AssessmentKindReportSection from "@/modules/assessment/components/records/AssessmentKindReportSection";
import { ASSESSMENT_KIND } from "@/shared/lib/assessmentKind";
import {
  mapPersonalityCatalogCard,
  type CatalogCardViewModel,
} from "@/modules/catalog/viewModels/catalogCard";
import heroImage from "@/assets/home/home-entry-personality.png";
import ieTestImage from "@/pages/catalog-personality/assets/icon/icon-ie-test.png";
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

const PersonalityCatalogPage = () => {
  const [catalogItems, setCatalogItems] = useState<CatalogCardViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const { mbtiItem, sbtiItem, bigFiveItem, enneagramItem } = useMemo(
    () => selectPersonalityLandingItems(catalogItems),
    [catalogItems],
  );

  const loadCatalog = useCallback(async () => {
      setLoading(true);
      setLoadError("");

      try {
        const result = await loadGroupedPersonalityCatalog({
          page: 1,
          pageSize: 50,
          category: "personality",
        });

        // `algorithm` is currently identical across typology models. Keep the
        // published models flat here so the landing page can form its product
        // entries from model code and status without merging unrelated models.
        const items: unknown[] = Array.isArray(result.publishedModels)
          ? result.publishedModels
          : [];
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

  const handleOpenMbtiModels = (item: CatalogCardViewModel | null) => {
    const familyCode = item?.familyCode || item?.key;
    if (!familyCode) {
      Taro.showToast({ title: "MBTI 测评暂未发布", icon: "none" });
      return;
    }
    Taro.navigateTo({
      url: routes.personalityModel({ model: "mbti", family_code: "mbti" }),
    });
  };

  const handleStartPersonalityAssessment = (
    item: CatalogCardViewModel | null,
    unavailableText: string,
  ) => {
    if (!item?.modelCode) {
      Taro.showToast({ title: unavailableText, icon: "none" });
      return;
    }
    Taro.navigateTo({
      url: routes.assessmentFill({
        kind: "personality",
        model_code: item.modelCode,
        mc: item.modelCode,
      }),
    });
  };

  const handleComingSoon = () => {
    Taro.showToast({ title: "该服务即将开放", icon: "none" });
  };

  return (
    <>
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

        {!loading && !loadError ? (
          <SurfaceCard className="personality-feature-card" onClick={() => handleOpenMbtiModels(mbtiItem)}>
            <View className="personality-feature-card__content">
              <Text className="personality-feature-card__kicker">16人格测评合集</Text>
              <Text className="personality-feature-card__title">测测你是 N 人还是 I 人</Text>
              <Text className="personality-feature-card__desc">
                进入全部 16 型人格测评，按题量与场景选择适合你的版本。
              </Text>
              <View className="personality-feature-card__meta-row">
                <Text className="personality-feature-card__meta">
                  {mbtiItem?.variantHint || "多种题版可选"}
                </Text>
                <Text className="personality-feature-card__meta">
                  {mbtiItem ? "查看全部测评" : "暂未发布"}
                </Text>
              </View>
            </View>
            <View className="personality-feature-card__icon">
              <Image className="personality-feature-card__image" src={ieTestImage} mode="aspectFit" />
            </View>
            <View className="personality-feature-card__arrow">
              <Icon name="arrow-right" size={20} color="#FFFFFF" />
            </View>
          </SurfaceCard>
        ) : null}

        {!loading && !loadError ? (
          <View className="personality-mini-grid">
            <SurfaceCard
              className={`personality-mini-card personality-mini-card--fun ${sbtiItem ? "" : "personality-mini-card--unavailable"}`}
              onClick={() => handleStartPersonalityAssessment(sbtiItem, "SBTI 测评暂未发布")}
            >
              <Text className="personality-mini-card__kicker">趣味探索</Text>
              <Text className="personality-mini-card__title">SBTI 趣味人格测评</Text>
              <Text className="personality-mini-card__desc">轻松生成趣味人格标签，适合娱乐与社交分享。</Text>
              <View className="personality-mini-card__button">
                <Text>{sbtiItem ? "开始 SBTI 测评" : "暂未发布"}</Text>
                {sbtiItem ? <Icon name="arrow-right" size={13} color="#0CA66A" /> : null}
              </View>
              <Image className="personality-mini-card__image" src={funTestImage} mode="aspectFit" />
            </SurfaceCard>

            <View className="personality-mini-row">
              <SurfaceCard
                className={`personality-mini-card personality-mini-card--compact personality-mini-card--ocean ${bigFiveItem ? "" : "personality-mini-card--unavailable"}`}
                onClick={() => handleStartPersonalityAssessment(bigFiveItem, "大五人格测评暂未发布")}
              >
                <Text className="personality-mini-card__kicker">科学人格模型</Text>
                <Text className="personality-mini-card__title">大五人格测评</Text>
                <Text className="personality-mini-card__desc">从五个稳定维度认识你的性格倾向，了解你的人格核心要素。</Text>
                <View className="personality-mini-card__button">
                  <Text>{bigFiveItem ? "开始测评" : "暂未发布"}</Text>
                  {bigFiveItem ? <Icon name="arrow-right" size={13} color="#2B7DE9" /> : null}
                </View>
              </SurfaceCard>

              <SurfaceCard
                className={`personality-mini-card personality-mini-card--compact personality-mini-card--deep ${enneagramItem ? "" : "personality-mini-card--unavailable"}`}
                onClick={() => handleStartPersonalityAssessment(enneagramItem, "九型人格测评暂未发布")}
              >
                <Text className="personality-mini-card__kicker">深度探索</Text>
                <Text className="personality-mini-card__title">九型人格测评</Text>
                <Text className="personality-mini-card__desc">从核心动机理解自己的选择，探索深层次的人格动力。</Text>
                <View className="personality-mini-card__button">
                  <Text>{enneagramItem ? "开始测评" : "暂未发布"}</Text>
                  {enneagramItem ? <Icon name="arrow-right" size={13} color="#7656D9" /> : null}
                </View>
              </SurfaceCard>
            </View>
          </View>
        ) : null}

        <AssessmentKindReportSection
          kind={ASSESSMENT_KIND.PERSONALITY}
          title="人格测评报告"
          subtitle="最近的人格探索记录"
          emptyText="暂无人格探索报告，完成测评后将在这里展示。"
          tone="personality"
          statusFilter=""
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
      </PageShell>
      <PrivacyAuthorization />
    </>
  );
};

export default PersonalityCatalogPage;
