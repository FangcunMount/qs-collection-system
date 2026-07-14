import React from "react";
import { Text, View } from "@tarojs/components";

import StatePanel from "@/shared/ui/StatePanel";
import { formatSimpleDate } from "@/shared/lib/dateFormatters";

import type { PersonalityReportDimensionViewModel, PersonalityReportViewModel } from "../../types";
import PersonalityReportHero from "./PersonalityReportHero";

const DimensionCard = ({ dimension }: { dimension: PersonalityReportDimensionViewModel }) => {
  const hasScore = dimension.score !== null;
  const hasMax = dimension.max_score !== null && dimension.max_score > 0;
  const percent = hasScore && hasMax
    ? Math.min(Math.round((Number(dimension.score) / Number(dimension.max_score)) * 100), 100)
    : 0;
  return (
    <View className="pr-dimension-card">
      <View className="pr-dimension-card__header">
        <Text className="pr-dimension-card__title">{dimension.title}</Text>
        {hasScore ? (
          <Text className="pr-dimension-card__score">
            {dimension.score}{hasMax ? <Text className="pr-dimension-card__score-max"> / {dimension.max_score}</Text> : null}
          </Text>
        ) : null}
      </View>
      {hasScore && hasMax ? <View className="pr-dimension-card__track"><View className="pr-dimension-card__bar" style={{ width: `${percent}%` }} /></View> : null}
      {dimension.description ? <View className="pr-dimension-card__desc">{dimension.description}</View> : null}
      {dimension.suggestion ? (
        <View className="pr-dimension-card__suggestion">
          <Text className="pr-dimension-card__suggestion-label">建议</Text>
          <View className="pr-dimension-card__suggestion-text">{dimension.suggestion}</View>
        </View>
      ) : null}
    </View>
  );
};

const PersonalityReportContent = ({ report }: { report: PersonalityReportViewModel }) => (
  <View className="personality-report-page report-page-content">
    <PersonalityReportHero
      modelExtra={report.hero.modelExtra}
      conclusion={report.hero.conclusion}
      modelTitle={report.modelTitle}
    />
    {report.testeeName || report.createdAt ? (
      <View className="pr-meta">
        {report.testeeName ? <Text className="pr-meta__name">{report.testeeName}</Text> : null}
        {report.createdAt ? <Text className="pr-meta__time">生成时间 · {formatSimpleDate(report.createdAt)}</Text> : null}
      </View>
    ) : null}
    {report.dimensions.length ? (
      <View className="pr-section">
        <View className="pr-section__header">
          <Text className="pr-section__title">维度解读</Text>
          <Text className="pr-section__subtitle">基于你的作答还原的人格维度倾向</Text>
        </View>
        <View className="pr-dimension-list">
          {report.dimensions.map((dimension, index) => <DimensionCard key={dimension.factor_code || index} dimension={dimension} />)}
        </View>
      </View>
    ) : null}
    {report.sections.length && !report.dimensions.length ? (
      <View className="pr-section">
        <View className="pr-section__header"><Text className="pr-section__title">报告解读</Text></View>
        <View className="pr-advice-list">
          {report.sections.map((section, index) => (
            <View className="pr-advice-card" key={section.key || index}>
              {section.title ? <Text className="pr-advice-card__category">{section.title}</Text> : null}
              <View className="pr-advice-card__content">{section.content}</View>
            </View>
          ))}
        </View>
      </View>
    ) : null}
    {report.suggestions.length ? (
      <View className="pr-section">
        <View className="pr-section__header"><Text className="pr-section__title">成长建议</Text></View>
        <View className="pr-advice-list">
          {report.suggestions.map((suggestion, index) => (
            <View className="pr-advice-card" key={`${suggestion.category}-${index}`}>
              {suggestion.category ? <Text className="pr-advice-card__category">{suggestion.category}</Text> : null}
              <View className="pr-advice-card__content">{suggestion.content}</View>
            </View>
          ))}
        </View>
      </View>
    ) : null}
    {!report.hasContent ? <StatePanel state="empty" tone="personality" title="暂无人格维度解读数据" /> : null}
  </View>
);

export default PersonalityReportContent;
