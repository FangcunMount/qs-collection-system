import React from "react";
import { Text, View } from "@tarojs/components";

import StatePanel from "@/shared/ui/StatePanel";
import { formatSimpleDate } from "@/shared/lib/dateFormatters";
import { resolvePersonalityDimensionScale } from "../../lib/personalityDimensionScale";

import type { PersonalityReportDimensionViewModel, PersonalityReportViewModel } from "../../types";
import PersonalityReportHero from "./PersonalityReportHero";

interface ReportRegionProps {
  number: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

const ReportRegion = ({ number, title, subtitle, children }: ReportRegionProps) => (
  <View className="pr-report-region">
    <View className="pr-report-region__header">
      <Text className="pr-report-region__number">{number}</Text>
      <View className="pr-report-region__heading">
        <Text className="pr-report-region__title">{title}</Text>
        <Text className="pr-report-region__subtitle">{subtitle}</Text>
      </View>
    </View>
    <View className="pr-report-region__content">{children}</View>
  </View>
);

const DimensionScale = ({
  dimension,
  outcomeCode,
}: {
  dimension: PersonalityReportDimensionViewModel;
  outcomeCode: string;
}) => {
  const scale = resolvePersonalityDimensionScale(dimension, outcomeCode);
  const fillStart = Math.min(scale.position, 50);
  const fillWidth = Math.abs(scale.position - 50);
  const leftActive = scale.hasValue && scale.leftPercent > scale.rightPercent;
  const rightActive = scale.hasValue && scale.rightPercent > scale.leftPercent;

  return (
    <View className="pr-dimension-scale">
      {dimension.title ? <Text className="pr-dimension-scale__title">{dimension.title}</Text> : null}
      <View className="pr-dimension-scale__poles">
        <View className={`pr-dimension-pole pr-dimension-pole--left ${leftActive ? "pr-dimension-pole--active" : ""}`}>
          <View className="pr-dimension-pole__identity">
            <Text className="pr-dimension-pole__code">{scale.left.code}</Text>
            <Text className="pr-dimension-pole__label">{scale.left.label}</Text>
          </View>
          {scale.hasValue ? <Text className="pr-dimension-pole__percent">{scale.leftPercent}%</Text> : null}
        </View>
        <View className={`pr-dimension-pole pr-dimension-pole--right ${rightActive ? "pr-dimension-pole--active" : ""}`}>
          <View className="pr-dimension-pole__identity">
            <Text className="pr-dimension-pole__code">{scale.right.code}</Text>
            <Text className="pr-dimension-pole__label">{scale.right.label}</Text>
          </View>
          {scale.hasValue ? <Text className="pr-dimension-pole__percent">{scale.rightPercent}%</Text> : null}
        </View>
      </View>
      <View className={`pr-dimension-scale__track ${scale.hasValue ? "" : "pr-dimension-scale__track--empty"}`}>
        <View className="pr-dimension-scale__center" />
        {scale.hasValue ? (
          <>
            <View
              className="pr-dimension-scale__fill"
              style={{ left: `${fillStart}%`, width: `${fillWidth}%` }}
            />
            <View className="pr-dimension-scale__marker" style={{ left: `${scale.position}%` }} />
          </>
        ) : null}
      </View>
      {dimension.description ? <View className="pr-dimension-scale__description">{dimension.description}</View> : null}
    </View>
  );
};

const comparableText = (value: string): string => value.replace(/\s+/g, "").toLowerCase();

const PersonalityReportContent = ({ report }: { report: PersonalityReportViewModel }) => {
  const conclusionKey = comparableText(report.hero.conclusion);
  const reportSections = report.sections.filter((section) => section.content);
  const showConclusion = Boolean(
    report.hero.conclusion
    && !reportSections.some((section) => comparableText(section.content) === conclusionKey),
  );
  const growthSuggestions = [
    ...report.suggestions,
    ...report.dimensions
      .filter((dimension) => dimension.suggestion)
      .map((dimension) => ({ category: dimension.title, content: dimension.suggestion })),
  ].filter((suggestion, index, list) => (
    list.findIndex((item) => comparableText(item.content) === comparableText(suggestion.content)) === index
  ));

  return (
    <View className="personality-report-page report-page-content">
      <PersonalityReportHero
        modelExtra={report.hero.modelExtra}
        modelTitle={report.modelTitle}
        imageUrl={report.hero.imageUrl}
        testeeName={report.testeeName}
        createdAtText={report.createdAt ? formatSimpleDate(report.createdAt) : ""}
      />

      <ReportRegion
        number="02"
        title="维度观察"
        subtitle="在两种倾向之间，查看你的自然偏好位置"
      >
        {report.dimensions.length ? (
          <View className="pr-dimension-list">
            {report.dimensions.map((dimension, index) => (
              <DimensionScale
                key={dimension.factor_code || index}
                dimension={dimension}
                outcomeCode={report.outcome.code}
              />
            ))}
          </View>
        ) : (
          <StatePanel state="empty" tone="personality" compact title="暂无维度数据" />
        )}
      </ReportRegion>

      <ReportRegion
        number="03"
        title="人格报告"
        subtitle="从整体特征和具体表现理解你的人格画像"
      >
        {showConclusion || reportSections.length ? (
          <View className="pr-report-copy">
            {showConclusion ? <View className="pr-report-copy__lead">{report.hero.conclusion}</View> : null}
            {reportSections.map((section, index) => (
              <View className="pr-report-copy__section" key={section.key || index}>
                {section.title ? <Text className="pr-report-copy__title">{section.title}</Text> : null}
                <View className="pr-report-copy__content">{section.content}</View>
              </View>
            ))}
          </View>
        ) : (
          <StatePanel state="empty" tone="personality" compact title="暂无人格解读内容" />
        )}
      </ReportRegion>

      <ReportRegion
        number="04"
        title="成长建议"
        subtitle="把人格理解转化为日常可以尝试的行动"
      >
        {growthSuggestions.length ? (
          <View className="pr-growth-list">
            {growthSuggestions.map((suggestion, index) => (
              <View className="pr-growth-card" key={`${suggestion.category}-${index}`}>
                <Text className="pr-growth-card__number">{String(index + 1).padStart(2, "0")}</Text>
                <View className="pr-growth-card__body">
                  {suggestion.category ? <Text className="pr-growth-card__category">{suggestion.category}</Text> : null}
                  <View className="pr-growth-card__content">{suggestion.content}</View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <StatePanel state="empty" tone="personality" compact title="暂无成长建议" />
        )}
      </ReportRegion>
    </View>
  );
};

export default PersonalityReportContent;
