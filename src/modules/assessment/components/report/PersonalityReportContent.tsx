import React from "react";
import { Text, View } from "@tarojs/components";

import StatePanel from "@/shared/ui/StatePanel";
import { formatSimpleDate } from "@/shared/lib/dateFormatters";

import type { PersonalityReportViewModel } from "../../types";
import PersonalityReportHero from "./PersonalityReportHero";
import PersonalityDimensionScales from "./PersonalityDimensionScales";

interface ReportRegionProps {
  number: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  className?: string;
}

const ReportRegion = ({ number, title, subtitle, children, className = "" }: ReportRegionProps) => (
  <View className={["pr-report-region", className].filter(Boolean).join(" ")}>
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

const comparableText = (value: string): string => value.replace(/\s+/g, "").toLowerCase();

const suggestionPresentation = (suggestion: { category: string; content: string }) => {
  let category = String(suggestion.category || "").trim();
  let content = String(suggestion.content || "").trim();
  const prefix = content.match(/^(优势|注意|提醒|建议)[：:]\s*/);
  if (prefix) {
    category = prefix[1] === "注意" ? "提醒" : prefix[1];
    content = content.slice(prefix[0].length).trim();
  } else if (/^(general|通用|一般)$/i.test(category)) {
    category = "";
  }
  return { category, content };
};

type GrowthGroupKey = "strength" | "attention" | "action" | "general";

interface GrowthSuggestionPresentation {
  category: string;
  content: string;
  source: "report" | "dimension";
}

const growthGroupDefinitions: Array<{
  key: GrowthGroupKey;
  eyebrow: string;
  title: string;
  description: string;
}> = [
  {
    key: "general",
    eyebrow: "参考",
    title: "报告建议",
    description: "结合具体情境理解以下建议",
  },
  {
    key: "strength",
    eyebrow: "保持",
    title: "可以发挥",
    description: "这些特质是你自然拥有的能量",
  },
  {
    key: "attention",
    eyebrow: "觉察",
    title: "需要留意",
    description: "在压力或惯性中，给自己多一点空间",
  },
  {
    key: "action",
    eyebrow: "行动",
    title: "可以尝试",
    description: "从一个容易执行的小改变开始",
  },
];

const growthGroupKey = (suggestion: GrowthSuggestionPresentation): GrowthGroupKey => {
  const category = comparableText(suggestion.category);
  const content = comparableText(suggestion.content);
  if (/(优势|长处|特质|天赋)/.test(category)) return "strength";
  if (/(注意|提醒|风险|挑战|警示)/.test(category)) return "attention";
  if (/(建议|行动|成长|改善|练习|协作)/.test(category)) return "action";
  if (!category && /^(可以|尝试|建议|保持|安排|设置|把|为自己)/.test(content)) return "action";
  return "general";
};

const visibleSuggestionContext = (category: string): string => (
  /^(优势|长处|特质|天赋|注意|提醒|风险|挑战|警示|建议|行动|成长|改善|练习)$/i.test(category)
    ? ""
    : category
);

const PersonalityReportContent = ({ report, supplement }: { report: PersonalityReportViewModel; supplement?: React.ReactNode }) => {
  const conclusionKey = comparableText(report.hero.conclusion);
  const reportSections = report.sections.filter((section) => section.content);
  const showConclusion = Boolean(
    report.hero.conclusion
    && !reportSections.some((section) => comparableText(section.content) === conclusionKey),
  );
  const occupiedReportCopy = [
    report.hero.conclusion,
    report.outcome.summary,
    String(report.hero.modelExtra.one_liner || ""),
    String(report.hero.modelExtra.tagline || ""),
    ...reportSections.map((section) => section.content),
  ].map(comparableText).filter(Boolean);
  const growthSuggestions: GrowthSuggestionPresentation[] = [
    ...report.suggestions.map((suggestion) => ({ ...suggestion, source: "report" as const })),
    ...report.dimensions
      .filter((dimension) => dimension.suggestion)
      .map((dimension) => ({
        category: dimension.title,
        content: dimension.suggestion,
        source: "dimension" as const,
      })),
  ]
    .map((suggestion) => ({ ...suggestionPresentation(suggestion), source: suggestion.source }))
    .filter((suggestion) => suggestion.content && !occupiedReportCopy.includes(comparableText(suggestion.content)))
    .filter((suggestion, index, list) => (
      list.findIndex((item) => comparableText(item.content) === comparableText(suggestion.content)) === index
    ));
  const growthGroups = growthGroupDefinitions
    .map((definition) => ({
      ...definition,
      suggestions: growthSuggestions.filter((suggestion) => growthGroupKey(suggestion) === definition.key),
    }))
    .filter((group) => group.suggestions.length);

  return (
    <View className="personality-report-page report-page-content">
      <PersonalityReportHero
        modelExtra={report.hero.modelExtra}
        modelTitle={report.modelTitle}
        imageUrl={report.hero.imageUrl}
        testeeName={report.testeeName}
        createdAtText={report.createdAt ? formatSimpleDate(report.createdAt) : ""}
      />

      {supplement}

      <ReportRegion
        number="02"
        title="人格报告"
        subtitle="类型通用说明 · 报告原文"
        className="pr-report-region--interpretation"
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
        number="03"
        title="成长建议"
        subtitle="原报告建议 · 结合真实经历阅读"
        className="pr-report-region--growth"
      >
        {growthGroups.length ? (
          <View className="pr-growth-groups">
            {growthGroups.map((group) => (
              <View className={`pr-growth-group pr-growth-group--${group.key}`} key={group.key}>
                <View className="pr-growth-group__header">
                  <Text className="pr-growth-group__eyebrow">{group.eyebrow}</Text>
                  <View className="pr-growth-group__heading">
                    <Text className="pr-growth-group__title">{group.title}</Text>
                    <Text className="pr-growth-group__description">{group.description}</Text>
                  </View>
                </View>
                <View className="pr-growth-group__items">
                  {group.suggestions.map((suggestion, index) => {
                    const context = visibleSuggestionContext(suggestion.category);
                    return (
                      <View className="pr-growth-item" key={`${suggestion.category}-${index}`}>
                        <Text className="pr-growth-item__index">{String(index + 1).padStart(2, "0")}</Text>
                        <View className="pr-growth-item__body">
                          {context ? <Text className="pr-growth-item__context">{context}</Text> : null}
                          <View className="pr-growth-item__content">{suggestion.content}</View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <StatePanel state="empty" tone="personality" compact title="暂无成长建议" />
        )}
      </ReportRegion>
      <ReportRegion
        number="04"
        title="维度观察"
        subtitle="结合各维度的得分与原始解释理解倾向 · 来自标准报告"
        className="pr-report-region--dimensions"
      >
        {report.dimensions.length ? (
          <PersonalityDimensionScales dimensions={report.dimensions} outcomeCode={report.outcome.code} />
        ) : (
          <StatePanel state="empty" tone="personality" compact title="暂无维度数据" />
        )}
      </ReportRegion>
      <Text className="pr-report-field-note">标尺比例、原始分与偏好强度为不同报告字段。</Text>
    </View>
  );
};

export default PersonalityReportContent;
