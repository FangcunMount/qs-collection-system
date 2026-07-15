import React from "react";
import { Text, View } from "@tarojs/components";

import StatePanel from "@/shared/ui/StatePanel";
import { formatSimpleDate } from "@/shared/lib/dateFormatters";

import type { PersonalityReportDimensionViewModel, PersonalityReportViewModel } from "../../types";
import PersonalityReportHero from "./PersonalityReportHero";

interface ReportBatchProps {
  index: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

const ReportBatch = ({ index, title, subtitle, children }: ReportBatchProps) => (
  <View className="pr-report-batch">
    <View className="pr-report-batch__header">
      <Text className="pr-report-batch__index">{String(index).padStart(2, "0")}</Text>
      <View className="pr-report-batch__heading">
        <Text className="pr-report-batch__title">{title}</Text>
        {subtitle ? <Text className="pr-report-batch__subtitle">{subtitle}</Text> : null}
      </View>
    </View>
    <View className="pr-report-batch__content">{children}</View>
  </View>
);

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

const PersonalityReportContent = ({ report }: { report: PersonalityReportViewModel }) => {
  let batchIndex = 0;
  return (
    <View className="personality-report-page report-page-content">
      <PersonalityReportHero
        modelExtra={report.hero.modelExtra}
        conclusion={report.hero.conclusion}
        modelTitle={report.modelTitle}
        imageUrl={report.hero.imageUrl}
        testeeName={report.testeeName}
        createdAtText={report.createdAt ? formatSimpleDate(report.createdAt) : ""}
      />
      {report.sections.length ? (
        <ReportBatch
          index={++batchIndex}
          title="详细解读"
          subtitle="从多个侧面了解这份人格画像"
        >
          <View className="pr-advice-list">
            {report.sections.map((section, index) => (
              <View className="pr-advice-card" key={section.key || index}>
                {section.title ? <Text className="pr-advice-card__category">{section.title}</Text> : null}
                <View className="pr-advice-card__content">{section.content}</View>
              </View>
            ))}
          </View>
        </ReportBatch>
      ) : null}
      {report.dimensions.length ? (
        <ReportBatch
          index={++batchIndex}
          title="维度观察"
          subtitle="基于你的作答呈现出的维度倾向"
        >
          <View className="pr-dimension-list">
            {report.dimensions.map((dimension, index) => <DimensionCard key={dimension.factor_code || index} dimension={dimension} />)}
          </View>
        </ReportBatch>
      ) : null}
      {report.suggestions.length ? (
        <ReportBatch
          index={++batchIndex}
          title="成长建议"
          subtitle="把理解转化为日常可以尝试的行动"
        >
          <View className="pr-advice-list">
            {report.suggestions.map((suggestion, index) => (
              <View className="pr-advice-card" key={`${suggestion.category}-${index}`}>
                {suggestion.category ? <Text className="pr-advice-card__category">{suggestion.category}</Text> : null}
                <View className="pr-advice-card__content">{suggestion.content}</View>
              </View>
            ))}
          </View>
        </ReportBatch>
      ) : null}
      {!report.hasContent ? <StatePanel state="empty" tone="personality" title="暂无人格维度解读数据" /> : null}
    </View>
  );
};

export default PersonalityReportContent;
