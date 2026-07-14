import React, { useCallback, useEffect, useState } from "react";
import Taro from "@tarojs/taro";
import { View, Text, Image } from "@tarojs/components";
import Icon from "@/shared/ui/Icon";

import { routes } from "@/shared/config/routes";
import AppNavigationBar from "@/shared/ui/AppNavigationBar";
import PageShell from "@/shared/ui/PageShell";
import SectionHeader from "@/shared/ui/SectionHeader";
import StatePanel from "@/shared/ui/StatePanel";
import AssessmentKindReportSection from "@/modules/assessment/components/records/AssessmentKindReportSection";
import SurfaceCard from "@/shared/ui/SurfaceCard";
import ActionButton from "@/shared/ui/ActionButton";
import { ASSESSMENT_KIND } from "@/shared/lib/assessmentKind";
import { listPublishedAssessmentModels } from "@/services/api/assessmentModelCatalogApi";
import {
  mapAbilityCatalogCard,
  type CatalogCardViewModel,
} from "@/modules/catalog/viewModels/catalogCard";
import behaviorHeroImage from "@/pages/catalog-ability/assets/hero/ability-catalog-v2.png";
import executiveImage from "@/pages/catalog-ability/assets/icon/icon-executive-function.png";
import abilityImage from "@/pages/catalog-ability/assets/icon/icon-behavior-ability.png";
import workingMemoryImage from "@/pages/catalog-ability/assets/icon/icon-working-memory.png";
import sensoryImage from "@/pages/catalog-ability/assets/home/category-sensory.png";
import "./AbilityCatalogPage.less";

const OBSERVATION_ITEMS = Object.freeze([
  {
    title: "任务启动",
    subtitle: "开始、计划与推进",
    image: executiveImage,
  },
  {
    title: "工作记忆",
    subtitle: "理解并保持步骤",
    image: workingMemoryImage,
  },
  {
    title: "感觉敏感",
    subtitle: "声音、触觉与光线",
    image: sensoryImage,
  },
  {
    title: "调节支持",
    subtitle: "找到更匹配的方法",
    image: abilityImage,
  },
]);

const FLOW_STEPS = Object.freeze([
  {
    step: "01",
    title: "选择测评",
    desc: "从已发布的行为能力测评中选择适合的方向。",
  },
  {
    step: "02",
    title: "完成填写",
    desc: "结合家庭日常表现，按真实情况完成问卷。",
  },
  {
    step: "03",
    title: "查看线索",
    desc: "把结果作为后续沟通和成长支持的参考。",
  },
]);

interface AbilityCatalogQuery {
  kind: string;
  page: number;
  pageSize: number;
}

const loadPublishedAbilityModels = listPublishedAssessmentModels as unknown as (
  query: AbilityCatalogQuery,
) => Promise<Record<string, unknown>>;

const ABILITY_CATALOG_KIND = "behavioral_rating";

const resolveAbilityKicker = (item: CatalogCardViewModel) => {
  const marker = `${item.code} ${item.title} ${item.description}`.toLowerCase();
  if (/sensory|感觉|统合/.test(marker)) return "感觉处理 · 家庭观察";
  if (/executive|执行|计划|工作记忆/.test(marker)) return "执行功能 · 日常表现";
  return "行为能力 · 成长观察";
};

const AbilityCatalogPage = () => {
  const [scrollTarget, setScrollTarget] = useState("");
  const [assessmentCards, setAssessmentCards] = useState<CatalogCardViewModel[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");

  const loadAbilityCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError("");

    try {
      const result = await loadPublishedAbilityModels({
        kind: ABILITY_CATALOG_KIND,
        page: 1,
        pageSize: 50,
      });
      const payload = (result.data || result) as Record<string, unknown>;
      const models: unknown[] = Array.isArray(payload.models)
        ? payload.models
        : (Array.isArray(payload.items) ? payload.items : []);
      setAssessmentCards(models.map(mapAbilityCatalogCard).filter((item) => !item.disabled));
    } catch (error) {
      console.warn("[AbilityCatalogPage] 加载行为能力模型目录失败", error);
      setAssessmentCards([]);
      setCatalogError("行为能力测评目录加载失败，请检查网络后重试。");
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAbilityCatalog();
  }, [loadAbilityCatalog]);

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

  const handleOpenAssessment = useCallback((item: CatalogCardViewModel) => {
    if (item.disabled) {
      Taro.showToast({
        title: "测评暂未发布",
        icon: "none",
      });
      return;
    }

    Taro.navigateTo({
      url: routes.assessmentFill({ q: item.code }),
    });
  }, []);

  return (
    <PageShell
      tone="ability"
      className="ability-home"
      contentClassName="ability-home__scroll"
      scrollIntoView={scrollTarget}
      navigation={(
        <AppNavigationBar title="行为能力" showBack onBack={handleBack} tone="ability" transparent />
      )}
    >

        <View className="ability-hero">
          <Image className="ability-hero__background" src={behaviorHeroImage} mode="aspectFill" />
          <View className="ability-hero__content">
            <Text className="ability-hero__title">看见行为背后的能力线索</Text>
            <Text className="ability-hero__subtitle">从家庭日常观察出发，理解孩子如何计划、调节与回应环境。</Text>
            <ActionButton tone="ability" className="ability-hero__action" onClick={handleViewAssessments}>查看测评</ActionButton>
          </View>
        </View>

        <View id="ability-specialized" className="ability-section ability-specialized">
          <SectionHeader
            title="核心测评"
            tone="ability"
            className="ability-section__header"
          />

          <View className="ability-assessment-grid">
            {catalogLoading ? (
              <StatePanel state="loading" title="正在加载行为能力测评" tone="ability" compact />
            ) : catalogError ? (
              <StatePanel
                state="error"
                title="行为能力测评目录加载失败"
                description={catalogError}
                actionText="重新加载"
                onAction={loadAbilityCatalog}
                tone="ability"
                compact
              />
            ) : assessmentCards.length === 0 ? (
              <StatePanel
                state="empty"
                title="暂无已发布测评"
                description="已发布的行为能力测评将在这里展示。"
                tone="ability"
                compact
              />
            ) : assessmentCards.map((item) => (
              <SurfaceCard
                key={item.key}
                className={`ability-assessment-card ability-assessment-card--${item.iconKey} ${item.disabled ? "is-disabled" : ""}`}
                onClick={() => handleOpenAssessment(item)}
              >
                <View className="ability-assessment-card__content">
                  <Text className="ability-assessment-card__kicker">
                    {resolveAbilityKicker(item)}
                  </Text>
                  <View className="ability-assessment-card__title-line">
                    <Text className="ability-assessment-card__title">{item.title}</Text>
                    {item.statusLabel ? (
                      <Text className="ability-assessment-card__badge">{item.statusLabel}</Text>
                    ) : null}
                  </View>
                  <Text className="ability-assessment-card__desc">{item.description}</Text>
                  <View className="ability-assessment-card__meta">
                    <Text className="ability-assessment-card__duration">{item.durationLabel}</Text>
                    {item.testedLabel ? (
                      <Text className="ability-assessment-card__tested">{item.testedLabel}</Text>
                    ) : null}
                  </View>
                </View>
                <View className="ability-assessment-card__arrow">
                  <Icon name="arrow-right" size={18} color="#FFFFFF" />
                </View>
              </SurfaceCard>
            ))}
          </View>
        </View>

        <AssessmentKindReportSection
          kind={ASSESSMENT_KIND.ABILITY}
          title="行为能力报告"
          subtitle="执行功能与感觉处理测评结果"
          emptyText="暂无行为能力报告，完成测评后将在这里展示。"
          tone="ability"
        />

        <View className="ability-section ability-observation">
          <SectionHeader
            title="观察重点"
            description="围绕已发布测评"
            tone="ability"
            className="ability-section__header"
          />
          <View className="ability-observation-grid">
            {OBSERVATION_ITEMS.map((item) => (
              <SurfaceCard key={item.title} className="ability-observation-card">
                <View className="ability-observation-card__icon">
                  <Image className="ability-observation-card__image" src={item.image} mode="aspectFit" />
                </View>
                <View className="ability-observation-card__text">
                  <Text className="ability-observation-card__title">{item.title}</Text>
                  <Text className="ability-observation-card__subtitle">{item.subtitle}</Text>
                </View>
              </SurfaceCard>
            ))}
          </View>
        </View>

        <View className="ability-section ability-flow">
          <Text className="ability-section__title">评估流程</Text>
          <View className="ability-flow__track">
            {FLOW_STEPS.map((item) => (
              <View key={item.step} className="ability-flow__step">
                <Text className="ability-flow__index">{item.step}</Text>
                <View className="ability-flow__body">
                  <Text className="ability-flow__title">{item.title}</Text>
                  <Text className="ability-flow__desc">{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View className="ability-home__note">
          <Text>行为能力测评用于儿童发展观察与家庭支持参考，不替代临床诊断；测评结果仅作为后续沟通和成长方案的线索。</Text>
        </View>

        <View className="ability-home__bottom-spacer" />
    </PageShell>
  );
};

export default AbilityCatalogPage;
