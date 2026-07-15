import React from "react";
import { Text, View } from "@tarojs/components";

import { formatSimpleDate } from "@/shared/lib/dateFormatters";
import StatePanel from "@/shared/ui/StatePanel";

import type {
  BehaviorReportFactorViewModel,
  BehaviorReportLevelViewModel,
  BehaviorReportNormReferenceViewModel,
  BehaviorReportViewModel,
} from "../../types";
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

const LEVEL_LABELS: Record<string, string> = {
  normal: "发展表现平稳",
  none: "发展表现平稳",
  low: "轻度偏离",
  elevated: "建议关注",
  attention: "建议关注",
  medium: "建议关注",
  high: "重点关注",
  severe: "重点关注",
};

const displayNumber = (value: number | null): string => {
  if (value === null) return "--";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
};

const scoreKindLabel = (kind: string): string => ({
  t_score: "T 分",
  percentile: "百分位",
  standard_score: "标准分",
  raw_score: "原始分",
}[kind] || "综合得分");

const levelLabel = (level: BehaviorReportLevelViewModel | null): string => {
  if (!level) return "能力画像已生成";
  return level.label || LEVEL_LABELS[level.code.toLowerCase()] || "能力画像已生成";
};

const levelTone = (level: BehaviorReportLevelViewModel | null): string => {
  const key = `${level?.severity || ""} ${level?.code || ""}`.toLowerCase();
  if (/high|severe|critical/.test(key)) return "focus";
  if (/elevated|attention|medium|watch|low/.test(key)) return "watch";
  return "stable";
};

const genderLabel = (gender: string): string => ({
  male: "男童",
  m: "男童",
  boy: "男童",
  female: "女童",
  f: "女童",
  girl: "女童",
}[gender.toLowerCase()] || gender);

const normCohortLabel = (reference: BehaviorReportNormReferenceViewModel): string => {
  const labels: string[] = [];
  if (reference.minAgeMonths !== null || reference.maxAgeMonths !== null) {
    const min = reference.minAgeMonths;
    const max = reference.maxAgeMonths;
    labels.push(min !== null && max !== null ? `${min}–${max} 月龄` : `${min ?? max} 月龄`);
  }
  if (reference.gender) labels.push(genderLabel(reference.gender));
  if (reference.formVariant) labels.push(reference.formVariant);
  return labels.length ? labels.join(" · ") : "通用常模";
};

const scalePosition = (value: number): number => Math.min(100, Math.max(0, ((value - 20) / 60) * 100));

const FactorCard = ({ factor }: { factor: BehaviorReportFactorViewModel }) => {
  const hasNorm = factor.tScore !== null && factor.normReference?.scoreKind === "t_score";
  const tone = levelTone(factor.level);
  return (
    <View className="behavior-factor-card">
      <View className="behavior-factor-card__header">
        <View className="behavior-factor-card__heading">
          <Text className="behavior-factor-card__title">{factor.title || factor.factorCode || "能力维度"}</Text>
          {factor.normReference ? (
            <Text className="behavior-factor-card__cohort">{normCohortLabel(factor.normReference)}</Text>
          ) : null}
        </View>
        <Text className={`behavior-level behavior-level--${tone}`}>{levelLabel(factor.level)}</Text>
      </View>

      <View className="behavior-score-grid">
        <View className="behavior-score-metric">
          <Text className="behavior-score-metric__label">原始分</Text>
          <Text className="behavior-score-metric__value">
            {displayNumber(factor.rawScore)}
            {factor.maxScore !== null ? <Text className="behavior-score-metric__max"> / {displayNumber(factor.maxScore)}</Text> : null}
          </Text>
        </View>
        <View className="behavior-score-metric behavior-score-metric--primary">
          <Text className="behavior-score-metric__label">T 分</Text>
          <Text className="behavior-score-metric__value">{displayNumber(factor.tScore)}</Text>
        </View>
        <View className="behavior-score-metric">
          <Text className="behavior-score-metric__label">百分位</Text>
          <Text className="behavior-score-metric__value">
            {factor.percentile === null ? "--" : `P${displayNumber(factor.percentile)}`}
          </Text>
        </View>
      </View>

      {hasNorm ? (
        <View className="behavior-factor-scale">
          <View className="behavior-factor-scale__labels">
            <Text>相对常模位置</Text>
            <Text>基准 {displayNumber(factor.normReference?.benchmark ?? null)}</Text>
          </View>
          <View className="behavior-factor-scale__track">
            <View
              className="behavior-factor-scale__benchmark"
              style={{ left: `${scalePosition(factor.normReference?.benchmark ?? 50)}%` }}
            />
            <View
              className="behavior-factor-scale__marker"
              style={{ left: `${scalePosition(factor.tScore ?? 50)}%` }}
            />
          </View>
          <View className="behavior-factor-scale__axis">
            <Text>20</Text><Text>50</Text><Text>80</Text>
          </View>
        </View>
      ) : null}

      {factor.description ? (
        <View className="behavior-factor-copy">
          <Text className="behavior-factor-copy__title">维度解读</Text>
          <Text className="behavior-factor-copy__body">{factor.description}</Text>
        </View>
      ) : null}
      {factor.suggestion ? (
        <View className="behavior-factor-copy behavior-factor-copy--suggestion">
          <Text className="behavior-factor-copy__title">成长建议</Text>
          <Text className="behavior-factor-copy__body">{factor.suggestion}</Text>
        </View>
      ) : null}
    </View>
  );
};

const BehaviorReportContent = ({ report }: BehaviorReportContentProps) => {
  const normPoints = report.factors.reduce<NormChartPoint[]>((result, factor) => {
    if (factor.tScore !== null && factor.normReference?.scoreKind === "t_score") {
      result.push({
        title: factor.title || factor.factorCode || "维度",
        tScore: factor.tScore,
        benchmark: factor.normReference.benchmark,
      });
    }
    return result;
  }, []);
  const primaryLabel = report.primaryScore?.label || scoreKindLabel(report.primaryScore?.kind || "");

  return (
    <View className="behavior-report">
      <View className="behavior-report-hero">
        <View className="behavior-report-hero__glow behavior-report-hero__glow--one" />
        <View className="behavior-report-hero__glow behavior-report-hero__glow--two" />
        <Text className="behavior-report-hero__eyebrow">行为能力成长报告</Text>
        <View className="behavior-report-hero__title-row">
          <Text className="behavior-report-hero__title">{report.modelName || "行为能力测评"}</Text>
          {report.testeeName ? <Text className="behavior-report-hero__testee">{report.testeeName}</Text> : null}
        </View>
        {report.createdAt ? (
          <Text className="behavior-report-hero__date">报告生成于 {formatSimpleDate(report.createdAt)}</Text>
        ) : null}
        <View className="behavior-report-hero__summary">
          <View className="behavior-report-hero__score">
            <Text className="behavior-report-hero__score-value">{displayNumber(report.primaryScore?.value ?? null)}</Text>
            <Text className="behavior-report-hero__score-label">{primaryLabel}</Text>
          </View>
          <View className="behavior-report-hero__conclusion">
            <Text className={`behavior-level behavior-level--${levelTone(report.level)}`}>{levelLabel(report.level)}</Text>
            <Text className="behavior-report-hero__conclusion-text">
              {report.conclusion || "报告已从多个维度整理本次行为能力表现，请结合下方常模对比和维度解读阅读。"}
            </Text>
          </View>
        </View>
      </View>

      <View className="behavior-report-stats">
        <View className="behavior-report-stat">
          <Text className="behavior-report-stat__value">{report.factors.length}</Text>
          <Text className="behavior-report-stat__label">能力维度</Text>
        </View>
        <View className="behavior-report-stat__divider" />
        <View className="behavior-report-stat">
          <Text className="behavior-report-stat__value">{normPoints.length}</Text>
          <Text className="behavior-report-stat__label">常模维度</Text>
        </View>
        <View className="behavior-report-stat__divider" />
        <View className="behavior-report-stat">
          <Text className="behavior-report-stat__value">{report.suggestions.length}</Text>
          <Text className="behavior-report-stat__label">综合建议</Text>
        </View>
      </View>

      <View className="behavior-report-section behavior-norm-card">
        <View className="behavior-report-section__header">
          <View>
            <Text className="behavior-report-section__eyebrow">NORM COMPARISON</Text>
            <Text className="behavior-report-section__title">能力维度与常模对比</Text>
          </View>
          <View className="behavior-norm-legend">
            <View className="behavior-norm-legend__item"><View className="behavior-norm-legend__dot behavior-norm-legend__dot--score" /><Text>本次 T 分</Text></View>
            <View className="behavior-norm-legend__item"><View className="behavior-norm-legend__line" /><Text>常模基准</Text></View>
          </View>
        </View>
        <Text className="behavior-report-section__description">
          T 分用于展示相对同龄常模的位置，基准值通常为 50。分数高低需结合量表方向和维度解读理解，不等同于诊断结论。
        </Text>
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
      </View>

      <View className="behavior-report-section">
        <View className="behavior-report-section__header">
          <View>
            <Text className="behavior-report-section__eyebrow">DIMENSION INSIGHTS</Text>
            <Text className="behavior-report-section__title">能力维度解读</Text>
          </View>
        </View>
        <View className="behavior-factor-list">
          {report.factors.map((factor, index) => (
            <FactorCard key={factor.factorCode || index} factor={factor} />
          ))}
        </View>
        {!report.factors.length ? (
          <StatePanel state="empty" tone="ability" compact title="暂无能力维度数据" />
        ) : null}
      </View>

      {report.suggestions.length ? (
        <View className="behavior-report-section behavior-suggestions-card">
          <Text className="behavior-report-section__eyebrow">GROWTH ACTIONS</Text>
          <Text className="behavior-report-section__title">综合成长建议</Text>
          <View className="behavior-suggestion-list">
            {report.suggestions.map((suggestion, index) => (
              <View key={`${suggestion.factorCode || suggestion.category}-${index}`} className="behavior-suggestion-item">
                <Text className="behavior-suggestion-item__index">{String(index + 1).padStart(2, "0")}</Text>
                <View className="behavior-suggestion-item__content">
                  {suggestion.category ? <Text className="behavior-suggestion-item__category">{suggestion.category}</Text> : null}
                  <Text className="behavior-suggestion-item__text">{suggestion.content}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View className="behavior-report-note">
        <Text className="behavior-report-note__mark">i</Text>
        <Text className="behavior-report-note__text">
          本报告用于理解日常行为与能力表现，建议结合真实生活情境持续观察；如有持续困扰，请咨询专业人员。
        </Text>
      </View>
    </View>
  );
};

export default BehaviorReportContent;
