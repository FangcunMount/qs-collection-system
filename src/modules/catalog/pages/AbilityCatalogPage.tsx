import React, { useCallback, useState } from "react";
import Taro from "@tarojs/taro";
import { View, Text, Image } from "@tarojs/components";
import { AtIcon } from "taro-ui";

import { routes } from "@/shared/config/routes";
import { ABILITY_SPECIALIZED_ASSESSMENTS } from "@/shared/config/abilityAssessments";
import AppNavigationBar from "@/shared/ui/AppNavigationBar";
import PageShell from "@/shared/ui/PageShell";
import SectionHeader from "@/shared/ui/SectionHeader";
import SurfaceCard from "@/shared/ui/SurfaceCard";
import AssessmentKindReportSection from "@/modules/assessment/components/records/AssessmentKindReportSection";
import { ASSESSMENT_KIND } from "@/shared/lib/assessmentKind";
import {
  mapAbilityCatalogCard,
  type CatalogCardViewModel,
} from "@/modules/catalog/viewModels/catalogCard";
import behaviorHeroImage from "@/pages/catalog-ability/assets/home/home-entry-behavior.webp";
import executiveImage from "@/pages/catalog-ability/assets/icon/icon-executive-function.png";
import abilityImage from "@/pages/catalog-ability/assets/icon/icon-behavior-ability.png";
import workingMemoryImage from "@/pages/catalog-ability/assets/icon/icon-working-memory.png";
import sensoryImage from "@/pages/catalog-ability/assets/home/category-sensory.png";
import "./AbilityCatalogPage.less";

const ASSESSMENT_IMAGES: Record<string, string> = {
  executive: executiveImage,
  sensory: sensoryImage,
};

const HERO_TAGS = Object.freeze(["科学评估", "专业解读", "成长支持"]);

const HERO_STATS = Object.freeze([
  { value: "2", label: "核心测评" },
  { value: "家庭", label: "日常观察" },
  { value: "成长", label: "支持建议" },
]);

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
    desc: "先从执行功能或感觉处理两个方向开始观察。",
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

const ASSESSMENT_CARDS: CatalogCardViewModel[] = ABILITY_SPECIALIZED_ASSESSMENTS
  .map(mapAbilityCatalogCard);

const AbilityCatalogPage = () => {
  const [scrollTarget, setScrollTarget] = useState("");

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
        title: "即将开放",
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
          <View className="ability-hero__content">
            <Text className="ability-hero__label">BEHAVIOR ABILITY</Text>
            <Text className="ability-hero__title">看见行为背后的能力线索</Text>
            <Text className="ability-hero__subtitle">关注儿童大脑发育与行为成长，帮助家庭找到更清晰的支持方向。</Text>
            <View className="ability-hero__tag-row">
              {HERO_TAGS.map((tag) => (
                <Text key={tag} className="ability-hero__tag">{tag}</Text>
              ))}
            </View>
            <View className="ability-hero__action" onClick={handleViewAssessments}>
              <Text>查看测评</Text>
              <AtIcon value="arrow-right" size="13" color="#FFFFFF" />
            </View>
          </View>
          <View className="ability-hero__visual">
            <Image className="ability-hero__brain" src={behaviorHeroImage} mode="aspectFit" />
            <View className="ability-hero__chip ability-hero__chip--top">
              <Image className="ability-hero__chip-image" src={workingMemoryImage} mode="aspectFit" />
            </View>
            <View className="ability-hero__chip ability-hero__chip--bottom">
              <Image className="ability-hero__chip-image" src={sensoryImage} mode="aspectFit" />
            </View>
          </View>
        </View>

        <View className="ability-stat-strip">
          {HERO_STATS.map((item) => (
            <View key={item.label} className="ability-stat">
              <Text className="ability-stat__value">{item.value}</Text>
              <Text className="ability-stat__label">{item.label}</Text>
            </View>
          ))}
        </View>

        <View id="ability-specialized" className="ability-section ability-specialized">
          <SectionHeader
            title="核心测评"
            actionLabel="暂仅展示 2 项"
            onAction={handleViewAssessments}
            tone="ability"
            className="ability-section__header"
          />

          <View className="ability-assessment-grid">
            {ASSESSMENT_CARDS.map((item, index) => (
              <SurfaceCard
                key={item.key}
                className={`ability-assessment-card ability-assessment-card--${item.iconKey} ${item.disabled ? "is-disabled" : ""}`}
                onClick={() => handleOpenAssessment(item)}
              >
                <View className="ability-assessment-card__rank">
                  <Text>{String(index + 1).padStart(2, "0")}</Text>
                </View>
                <View className="ability-assessment-card__icon">
                  <Image
                    className="ability-assessment-card__image"
                    src={ASSESSMENT_IMAGES[item.iconKey] || abilityImage}
                    mode="aspectFit"
                  />
                </View>
                <View className="ability-assessment-card__content">
                  <Text className="ability-assessment-card__kicker">
                    {item.iconKey === "sensory" ? "感觉处理 · 家庭观察" : "执行功能 · 日常表现"}
                  </Text>
                  <View className="ability-assessment-card__title-line">
                    <Text className="ability-assessment-card__title">{item.title}</Text>
                    <Text className="ability-assessment-card__badge">{item.statusLabel}</Text>
                  </View>
                  <Text className="ability-assessment-card__desc">{item.description}</Text>
                  <View className="ability-assessment-card__meta">
                    <Text className="ability-assessment-card__duration">{item.durationLabel}</Text>
                    <Text className="ability-assessment-card__tested">{item.testedLabel || "持续扩展中"}</Text>
                  </View>
                </View>
                <View className="ability-assessment-card__arrow">
                  <AtIcon value="chevron-right" size="18" color="#FFFFFF" />
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
            description="围绕 2 项测评"
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
