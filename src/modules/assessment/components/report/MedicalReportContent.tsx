import React, { useState } from "react";
import { Text, View } from "@tarojs/components";

import FilterChip from "@/shared/ui/FilterChip";
import StatePanel from "@/shared/ui/StatePanel";
import { getRiskConfig } from "@/shared/lib/statusFormatters";

import type { MedicalReportFactorViewModel } from "../../types";
import FactorBarChart from "./FactorBarChart";
import FactorScatterChart from "./FactorScatterChart";

type ReportTab = "factor-analysis" | "pro-advice";
type ChartType = "overview" | "bar" | "scatter";

interface MedicalReportContentProps {
  factors: MedicalReportFactorViewModel[];
}

const TypedFactorBarChart = FactorBarChart as React.ComponentType<{ data: MedicalReportFactorViewModel[] }>;
const TypedFactorScatterChart = FactorScatterChart as React.ComponentType<{ data: MedicalReportFactorViewModel[] }>;

const factorPercent = (factor: MedicalReportFactorViewModel): number => {
  if (factor.score === null || factor.maxScore === null || factor.maxScore <= 0) return 0;
  return Math.min(Math.max((Number(factor.score) / Number(factor.maxScore)) * 100, 0), 100);
};

const FactorCard = ({ factor }: { factor: MedicalReportFactorViewModel }) => {
  const risk = getRiskConfig(factor.riskLevel);
  const hasScore = factor.score !== null;
  const hasMax = factor.maxScore !== null && factor.maxScore > 0;
  const percent = hasScore && hasMax
    ? Math.min((Number(factor.score) / Number(factor.maxScore)) * 100, 100)
    : 0;
  return (
    <View className={`factor-card ${risk.className}`}>
      <View className="factor-card-header">
        <Text className="factor-card-title">{factor.title}</Text>
        <View className={`factor-risk-badge ${risk.className}`}>
          <Text className="risk-label">{risk.label}</Text>
        </View>
      </View>
      <View className="factor-card-body">
        <View className="factor-score-progress-wrapper">
          <View className="score-progress-header">
            <Text className="score-label">因子得分</Text>
            <Text className="score-value-text">
              {hasScore ? factor.score : "--"}
              {hasMax ? <Text className="score-max-text"> / {factor.maxScore}</Text> : null}
            </Text>
          </View>
          {hasMax && hasScore ? (
            <View className="score-progress-container">
              <View className="score-progress-track">
                <View className="score-progress-bar" style={{ width: `${percent}%`, backgroundColor: risk.bgColor }}>
                  {percent >= 15 ? <Text className="score-progress-text" style={{ color: risk.textColor }}>{Math.round(percent)}%</Text> : null}
                </View>
              </View>
              {percent < 15 ? <Text className="score-progress-text-outside" style={{ color: risk.bgColor }}>{Math.round(percent)}%</Text> : null}
            </View>
          ) : (
            <View className="score-progress-container">
              <View className="score-progress-track"><View className="score-progress-bar-empty" /></View>
              <Text className="score-progress-text-outside">--</Text>
            </View>
          )}
        </View>
        {factor.content ? (
          <View className="factor-section">
            <Text className="factor-section-title">解读</Text>
            <View className="factor-content">{factor.content}</View>
          </View>
        ) : null}
        {factor.suggestion ? (
          <View className="factor-section">
            <Text className="factor-section-title">建议</Text>
            <View className="factor-suggestion">{factor.suggestion}</View>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const MedicalReportContent = ({ factors }: MedicalReportContentProps) => {
  const [activeTab, setActiveTab] = useState<ReportTab>("factor-analysis");
  const [chartType, setChartType] = useState<ChartType>("overview");
  return (
    <>
      <View className="tab-controller">
        <View className="tab-buttons">
          <FilterChip tone="medical" selected={activeTab === "factor-analysis"} onClick={() => setActiveTab("factor-analysis")}>因子分析</FilterChip>
          <FilterChip tone="medical" selected={activeTab === "pro-advice"} onClick={() => setActiveTab("pro-advice")}>详细建议</FilterChip>
        </View>
      </View>
      <View className="tab-content-area">
        {activeTab === "factor-analysis" ? (
          <View className="factor-analysis-content">
            {factors.length ? (
              <View className="factor-chart-card">
                <View className="chart-header">
                  <Text className="card-title">因子维度分布</Text>
                  <View className="chart-toggle">
                    {(["overview", "bar", "scatter"] as ChartType[]).map((type) => (
                      <FilterChip key={type} tone="medical" selected={chartType === type} onClick={() => setChartType(type)}>
                        {type === "overview" ? "概览" : type === "bar" ? "条形图" : "散点图"}
                      </FilterChip>
                    ))}
                  </View>
                </View>
                {chartType === "overview" ? (
                  <View className="factor-overview-chart">
                    {factors.map((factor, index) => {
                      const risk = getRiskConfig(factor.riskLevel);
                      const percent = factorPercent(factor);
                      return (
                        <View key={factor.factorCode || index} className="factor-overview-chart__row">
                          <View className="factor-overview-chart__header">
                            <Text className="factor-overview-chart__name">{factor.title}</Text>
                            <Text className="factor-overview-chart__value">
                              {factor.score ?? "--"}{factor.maxScore != null ? ` / ${factor.maxScore}` : ""}
                            </Text>
                          </View>
                          <View className="factor-overview-chart__track">
                            <View
                              className="factor-overview-chart__bar"
                              style={{ width: `${percent}%`, backgroundColor: risk.bgColor }}
                            />
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View className="factor-chart-summary">
                    {factors.slice(0, 6).map((factor, index) => (
                      <View key={factor.factorCode || index} className="factor-chart-summary__row">
                        <Text className="factor-chart-summary__name">{factor.title}</Text>
                        <Text className="factor-chart-summary__value">
                          {factor.score ?? "--"}{factor.maxScore != null ? ` / ${factor.maxScore}` : ""}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
                {chartType === "bar" ? (
                  <View className="bar-chart-container"><TypedFactorBarChart data={factors} /></View>
                ) : chartType === "scatter" ? (
                  <View className="scatter-chart-container"><TypedFactorScatterChart data={factors} /></View>
                ) : null}
              </View>
            ) : (
              <StatePanel state="empty" tone="medical" compact title="暂无因子分析数据" />
            )}
          </View>
        ) : (
          <View className="pro-advice-content">
            <View className="factor-cards-list">
              {factors.map((factor, index) => <FactorCard key={factor.factorCode || index} factor={factor} />)}
            </View>
            {!factors.length ? <StatePanel state="empty" tone="medical" compact title="暂无详细建议" /> : null}
          </View>
        )}
      </View>
    </>
  );
};

export default MedicalReportContent;
