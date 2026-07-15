import React, { useMemo } from "react";
import { Image, Text, View } from "@tarojs/components";

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

const tScorePosition = (value: number): string => `${Math.max(0, Math.min(100, ((value - 30) / 50) * 100))}%`;

const AbilityDimensionCard = ({ item }: { item: BehaviorFactorPresentation }) => {
  const factor = item.factor;
  const hasNormScore = factor.tScore !== null && factor.normReference?.scoreKind === "t_score";
  const benchmark = factor.normReference?.benchmark ?? 50;
  return (
    <View className={`behavior-ability-card behavior-palette--${item.palette}`}>
      <View className="behavior-ability-card__header">
        <View className="behavior-ability-card__title-row">
          <Text className={`behavior-factor-icon behavior-palette--${item.palette}`}>{item.icon}</Text>
          <View>
            <Text className="behavior-ability-card__title">{factor.title || factor.factorCode || "能力维度"}</Text>
            {factor.normReference ? (
              <Text className="behavior-ability-card__norm">{normCohortLabel(factor.normReference)}</Text>
            ) : null}
          </View>
        </View>
        <View className="behavior-ability-card__result">
          <View className="behavior-ability-card__score-row">
            <Text className="behavior-ability-card__score">{displayNumber(item.scoreValue)}</Text>
            <Text className="behavior-ability-card__score-kind">{item.scoreKind === "t_score" ? "T 分" : "原始分"}</Text>
          </View>
          <Text className={`behavior-status-badge behavior-status-badge--${item.statusLabel === "常模范围" ? "stable" : "support"}`}>
            {item.statusLabel}
          </Text>
        </View>
      </View>

      {hasNormScore ? (
        <View className="behavior-score-scale">
          <View className="behavior-score-scale__track">
            <View className="behavior-score-scale__range behavior-score-scale__range--stable" />
            <View className="behavior-score-scale__range behavior-score-scale__range--watch" />
            <View className="behavior-score-scale__range behavior-score-scale__range--support" />
            <View className="behavior-score-scale__marker behavior-score-scale__marker--norm" style={{ left: tScorePosition(benchmark) }}>
              <Text>常模 {displayNumber(benchmark)}</Text>
            </View>
            <View className="behavior-score-scale__marker behavior-score-scale__marker--score" style={{ left: tScorePosition(factor.tScore as number) }}>
              <Text>{displayNumber(factor.tScore)}</Text>
            </View>
          </View>
          <View className="behavior-score-scale__labels">
            <Text className="behavior-score-scale__label behavior-score-scale__label--start">30</Text>
            <Text className="behavior-score-scale__label behavior-score-scale__label--watch">60</Text>
            <Text className="behavior-score-scale__label behavior-score-scale__label--support">70</Text>
            <Text className="behavior-score-scale__label behavior-score-scale__label--end">80+</Text>
          </View>
          <Text className="behavior-score-scale__hint">T 分越高，表示该维度越需要结合日常表现给予关注和支持</Text>
        </View>
      ) : null}

      <View className="behavior-ability-card__meta">
        {factor.rawScore !== null ? <Text>原始分 {displayNumber(factor.rawScore)}</Text> : null}
        {factor.percentile !== null ? <Text>百分位 P{displayNumber(factor.percentile)}</Text> : null}
        {!hasNormScore ? <Text>暂无常模转换数据</Text> : null}
      </View>
      {factor.description ? <Text className="behavior-ability-card__copy">{factor.description}</Text> : null}
      {factor.suggestion ? (
        <View className="behavior-ability-card__suggestion">
          <Text className="behavior-ability-card__suggestion-label">支持建议</Text>
          <Text className="behavior-ability-card__suggestion-copy">{factor.suggestion}</Text>
        </View>
      ) : null}
    </View>
  );
};

const BehaviorReportContent = ({ report }: BehaviorReportContentProps) => {
  const presentation = useMemo(() => buildBehaviorReportPresentation(report), [report]);
  const overallSuggestions = useMemo(
    () => report.suggestions.filter((suggestion) => suggestion.content.trim()),
    [report.suggestions],
  );
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
          <View className="behavior-portrait-section__header">
            <View>
              <Text className="behavior-section-card__title">完整能力画像</Text>
              <Text className="behavior-section-card__subtitle">全部维度已展开，可直接对照得分、常模与支持建议</Text>
            </View>
            <Text className="behavior-portrait-section__count">{presentation.portraitFactors.length} 个维度</Text>
          </View>
          <View className="behavior-ability-list">
            {presentation.portraitFactors.map((item, index) => (
              <AbilityDimensionCard key={item.factor.factorCode || index} item={item} />
            ))}
          </View>
          {overallSuggestions.length ? (
            <View className="behavior-overall-advice">
              <Text className="behavior-overall-advice__title">整体支持建议</Text>
              {overallSuggestions.map((suggestion, index) => (
                <View key={`${suggestion.category}-${index}`} className="behavior-overall-advice__item">
                  <Text className="behavior-overall-advice__index">{index + 1}</Text>
                  <View className="behavior-overall-advice__content">
                    {suggestion.category ? <Text className="behavior-overall-advice__category">{suggestion.category}</Text> : null}
                    <Text className="behavior-overall-advice__copy">{suggestion.content}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {!presentation.portraitFactors.length && overallSuggestions.length ? (
        <View className="behavior-section-card behavior-overall-advice">
          <Text className="behavior-overall-advice__title">整体支持建议</Text>
          {overallSuggestions.map((suggestion, index) => (
            <View key={`${suggestion.category}-${index}`} className="behavior-overall-advice__item">
              <Text className="behavior-overall-advice__index">{index + 1}</Text>
              <View className="behavior-overall-advice__content">
                {suggestion.category ? <Text className="behavior-overall-advice__category">{suggestion.category}</Text> : null}
                <Text className="behavior-overall-advice__copy">{suggestion.content}</Text>
              </View>
            </View>
          ))}
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
