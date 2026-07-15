import React, { useMemo, useState } from "react";
import { Button, Image, ScrollView, Text, View } from "@tarojs/components";

import behaviorHeroImage from "@/assets/home/home-child-behavior.png";
import childAvatarImage from "@/assets/icon/icon_child.png";
import abilityBadgeImage from "@/assets/icon/icon-behavior-ability.png";
import { formatSimpleDate } from "@/shared/lib/dateFormatters";
import StatePanel from "@/shared/ui/StatePanel";

import type {
  BehaviorReportFactorViewModel,
  BehaviorReportNormReferenceViewModel,
  BehaviorReportViewModel,
} from "../../types";
import {
  buildBehaviorReportPresentation,
  type BehaviorFactorPresentation,
} from "../../viewModels/behaviorReportPresentation";
import BehaviorNormComparisonChart from "./BehaviorNormComparisonChart";
import "./BehaviorReportContent.less";

interface BehaviorReportContentProps {
  report: BehaviorReportViewModel;
}

interface NormChartPoint {
  title: string;
  tScore: number;
  benchmark: number;
}

const TypedBehaviorNormComparisonChart = BehaviorNormComparisonChart as React.ComponentType<{ data: NormChartPoint[] }>;

const displayNumber = (value: number | null): string => {
  if (value === null) return "--";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
};

const genderLabel = (gender: string): string => ({
  male: "男童",
  m: "男童",
  boy: "男童",
  female: "女童",
  f: "女童",
  girl: "女童",
}[gender.toLowerCase()] || gender);

const formVariantLabel = (variant: string): string => ({
  parent: "家长版",
  teacher: "教师版",
  self: "自评版",
}[variant.toLowerCase()] || variant);

const normCohortLabel = (reference: BehaviorReportNormReferenceViewModel): string => {
  const labels: string[] = [];
  if (reference.minAgeMonths !== null || reference.maxAgeMonths !== null) {
    const min = reference.minAgeMonths;
    const max = reference.maxAgeMonths;
    labels.push(min !== null && max !== null ? `${min}–${max} 月龄` : `${min ?? max} 月龄`);
  }
  if (reference.gender) labels.push(genderLabel(reference.gender));
  if (reference.formVariant) labels.push(formVariantLabel(reference.formVariant));
  return labels.length ? labels.join(" · ") : "通用常模";
};

const PortraitCard = ({ item }: { item: BehaviorFactorPresentation }) => (
  <View className={`behavior-portrait-card behavior-palette--${item.palette}`}>
    <View className="behavior-portrait-card__header">
      <Text className="behavior-factor-icon">{item.icon}</Text>
      <Text className="behavior-portrait-card__title">{item.factor.title || "能力维度"}</Text>
    </View>
    <View className="behavior-portrait-card__score-row">
      <Text className="behavior-portrait-card__score">{displayNumber(item.scoreValue)}</Text>
      <Text className="behavior-portrait-card__score-kind">{item.scoreKind === "t_score" ? "T" : "原始分"}</Text>
    </View>
    <Text className="behavior-portrait-card__status">{item.statusLabel}</Text>
    <View className="behavior-segment-meter">
      {[1, 2, 3, 4, 5].map((segment) => (
        <View
          key={segment}
          className={`behavior-segment-meter__item ${segment <= item.meterSegments ? "behavior-segment-meter__item--active" : ""}`}
        />
      ))}
    </View>
  </View>
);

const InsightCard = ({
  item,
  variant,
}: {
  item: BehaviorFactorPresentation;
  variant: "strength" | "support";
}) => (
  <View className={`behavior-insight-card behavior-insight-card--${variant} behavior-palette--${item.palette}`}>
    <Text className="behavior-insight-card__icon">{variant === "strength" ? "★" : item.icon}</Text>
    <View className="behavior-insight-card__content">
      <Text className="behavior-insight-card__title">{item.factor.title || "能力维度"}</Text>
      <Text className="behavior-insight-card__text">
        {variant === "support"
          ? item.factor.suggestion || item.factor.description || "建议结合日常情境持续观察，并提供清晰、稳定的支持。"
          : item.factor.description || "当前表现处于同龄常模范围，可继续保持已有支持方式。"}
      </Text>
    </View>
  </View>
);

const FactorDetailCard = ({ item }: { item: BehaviorFactorPresentation }) => {
  const factor = item.factor;
  return (
    <View className="behavior-detail-card">
      <View className="behavior-detail-card__header">
        <View className="behavior-detail-card__title-row">
          <Text className={`behavior-factor-icon behavior-palette--${item.palette}`}>{item.icon}</Text>
          <View>
            <Text className="behavior-detail-card__title">{factor.title || factor.factorCode || "能力维度"}</Text>
            {factor.normReference ? (
              <Text className="behavior-detail-card__norm">{normCohortLabel(factor.normReference)}</Text>
            ) : null}
          </View>
        </View>
        <Text className={`behavior-status-badge behavior-status-badge--${item.statusLabel === "常模范围" ? "stable" : "support"}`}>
          {item.statusLabel}
        </Text>
      </View>
      <View className="behavior-detail-card__scores">
        <Text>原始分 {displayNumber(factor.rawScore)}</Text>
        <Text>T 分 {displayNumber(factor.tScore)}</Text>
        <Text>百分位 {factor.percentile === null ? "--" : `P${displayNumber(factor.percentile)}`}</Text>
      </View>
      {factor.description ? <Text className="behavior-detail-card__copy">{factor.description}</Text> : null}
      {factor.suggestion ? <Text className="behavior-detail-card__suggestion">建议：{factor.suggestion}</Text> : null}
    </View>
  );
};

const BehaviorReportContent = ({ report }: BehaviorReportContentProps) => {
  const [showDetails, setShowDetails] = useState(false);
  const presentation = useMemo(() => buildBehaviorReportPresentation(report), [report]);
  const normPoints = presentation.chartFactors.reduce<NormChartPoint[]>((result, item) => {
    const reference = item.factor.normReference;
    if (item.factor.tScore !== null && reference?.scoreKind === "t_score") {
      result.push({
        title: item.factor.title || item.factor.factorCode || "维度",
        tScore: item.factor.tScore,
        benchmark: reference.benchmark,
      });
    }
    return result;
  }, []);
  const firstNormReference = presentation.chartFactors.find((item) => item.factor.normReference)?.factor.normReference;

  return (
    <View className="behavior-report">
      <View className="behavior-report-hero">
        <Image className="behavior-report-hero__illustration" src={behaviorHeroImage} mode="aspectFit" />
        <View className="behavior-report-hero__content">
          <Text className="behavior-report-hero__family">{presentation.familyLabel}成长报告</Text>
          <Text className="behavior-report-hero__title">{report.modelName || "行为能力测评"}</Text>
          <View className="behavior-report-hero__profile">
            <Image className="behavior-report-hero__avatar" src={childAvatarImage} mode="aspectFit" />
            <View>
              <Text className="behavior-report-hero__name">{report.testeeName || "测评对象"}</Text>
              {report.createdAt ? (
                <Text className="behavior-report-hero__date">{formatSimpleDate(report.createdAt)}</Text>
              ) : null}
            </View>
          </View>
          <Text className="behavior-report-hero__message">{presentation.heroMessage}</Text>
        </View>
      </View>

      <View className="behavior-summary-card">
        <View className="behavior-summary-card__score-block">
          <Text className="behavior-summary-card__score">{displayNumber(presentation.summaryScore)}</Text>
          <Text className="behavior-summary-card__score-label">{presentation.summaryScoreLabel}</Text>
        </View>
        <View className="behavior-summary-card__divider" />
        <View className="behavior-summary-card__content">
          <Text className="behavior-summary-card__headline">{presentation.summaryHeadline}</Text>
          <Text className="behavior-summary-card__copy">
            {report.conclusion || "结果用于成长观察，不代表医学诊断"}
          </Text>
        </View>
        <Image className="behavior-summary-card__badge" src={abilityBadgeImage} mode="aspectFit" />
      </View>

      <View className="behavior-section-card behavior-norm-card">
        <View className="behavior-section-card__header">
          <View>
            <Text className="behavior-section-card__title">{presentation.chartTitle}</Text>
            <Text className="behavior-section-card__subtitle">标准分 T</Text>
          </View>
          <View className="behavior-chart-legend">
            <View className="behavior-chart-legend__item">
              <View className="behavior-chart-legend__line behavior-chart-legend__line--score" />
              <Text>本次得分</Text>
            </View>
            <View className="behavior-chart-legend__item">
              <View className="behavior-chart-legend__line behavior-chart-legend__line--norm" />
              <Text>同龄常模</Text>
            </View>
          </View>
        </View>
        {firstNormReference ? (
          <Text className="behavior-norm-card__meta">
            {normCohortLabel(firstNormReference)}
            {firstNormReference.tableVersion ? ` · 常模 ${firstNormReference.tableVersion}` : ""}
          </Text>
        ) : null}
        {normPoints.length ? (
          <TypedBehaviorNormComparisonChart data={normPoints} />
        ) : (
          <StatePanel
            state="empty"
            tone="ability"
            compact
            title="当前报告暂无常模对比数据"
            description="历史报告可能尚未包含 T 分和常模版本，其他维度内容仍可正常阅读。"
          />
        )}
        {normPoints.length ? (
          <View className="behavior-chart-callout">
            <Text className="behavior-chart-callout__icon">芽</Text>
            <Text className="behavior-chart-callout__text">{presentation.chartCallout}</Text>
          </View>
        ) : null}
      </View>

      {presentation.portraitFactors.length ? (
        <View className="behavior-section-card behavior-portrait-section">
          <Text className="behavior-section-card__title">能力画像</Text>
          <Text className="behavior-section-card__subtitle">左右滑动查看全部维度</Text>
          <ScrollView
            scrollX
            enhanced
            showScrollbar={false}
            className="behavior-portrait-scroll"
          >
            <View className="behavior-portrait-track">
              {presentation.portraitFactors.map((item, index) => (
                <PortraitCard key={item.factor.factorCode || index} item={item} />
              ))}
            </View>
          </ScrollView>
        </View>
      ) : null}

      {presentation.strengthFactors.length ? (
        <View className="behavior-section-card behavior-insight-section">
          <Text className="behavior-section-card__title">相对稳定的能力表现</Text>
          <View className="behavior-insight-grid">
            {presentation.strengthFactors.map((item, index) => (
              <InsightCard key={item.factor.factorCode || index} item={item} variant="strength" />
            ))}
          </View>
        </View>
      ) : null}

      {presentation.supportFactors.length ? (
        <View className="behavior-section-card behavior-insight-section">
          <Text className="behavior-section-card__title">{presentation.supportTitle}</Text>
          <View className="behavior-insight-grid">
            {presentation.supportFactors.map((item, index) => (
              <InsightCard key={item.factor.factorCode || index} item={item} variant="support" />
            ))}
          </View>
        </View>
      ) : null}

      {presentation.practices.length ? (
        <View className="behavior-section-card behavior-practice-section">
          <Text className="behavior-section-card__title">家庭练习建议</Text>
          <View className="behavior-practice-grid">
            {presentation.practices.map((practice, index) => (
              <View key={`${practice.title}-${index}`} className={`behavior-practice-card behavior-palette--${practice.palette}`}>
                <Text className="behavior-practice-card__index">{index + 1}</Text>
                <Text className="behavior-practice-card__title">{practice.title}</Text>
                <Text className="behavior-practice-card__text">{practice.content}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {presentation.portraitFactors.length ? (
        <View className="behavior-details-section">
          <Button
            className="behavior-details-toggle"
            hoverClass="behavior-details-toggle--pressed"
            onClick={() => setShowDetails((current) => !current)}
          >
            <Text>{showDetails ? "收起维度详情" : "查看全部维度详情"}</Text>
            <Text className="behavior-details-toggle__arrow">{showDetails ? "⌃" : "⌄"}</Text>
          </Button>
          {showDetails ? (
            <View className="behavior-detail-list">
              {presentation.portraitFactors.map((item, index) => (
                <FactorDetailCard key={item.factor.factorCode || index} item={item} />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      <View className="behavior-report-note">
        <Text className="behavior-report-note__text">
          结果用于成长观察，不代表医学诊断。请结合孩子在家庭、学校等真实情境中的表现持续理解。
        </Text>
      </View>
    </View>
  );
};

export default BehaviorReportContent;
