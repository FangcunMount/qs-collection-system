import React from "react";
import Taro from "@tarojs/taro";
import { Text, View } from "@tarojs/components";

import RiskTag from "@/shared/ui/RiskTag";
import StatePanel from "@/shared/ui/StatePanel";
import { routes } from "@/shared/config/routes";
import { formatChartDateLabel } from "@/shared/lib/dateFormatters";

import { formatReportDelta } from "../../lib/reportTrend";
import type { MedicalReportFactorViewModel } from "../../types";
import TrendLineChart from "./TrendLineChart";

type Source = Record<string, unknown>;
interface TrendPoint { label: string; fullLabel: string; value: number }

const TypedTrendLineChart = TrendLineChart as React.ComponentType<{
  chartId: string;
  points: TrendPoint[];
  lineColor: string;
  areaColor: string;
  height: string;
}>;

interface MedicalReportTrendSummaryProps {
  summary: Source | null;
  loading: boolean;
  assessmentId: string;
  testeeId: string;
  factors: MedicalReportFactorViewModel[];
  riskLevel: string;
}

const list = (value: unknown): Source[] => Array.isArray(value) ? value as Source[] : [];
const source = (value: unknown): Source | null => value && typeof value === "object" ? value as Source : null;

const MedicalReportTrendSummary = ({
  summary,
  loading,
  assessmentId,
  testeeId,
  factors,
  riskLevel,
}: MedicalReportTrendSummaryProps) => {
  if (loading) {
    return <StatePanel state="loading" tone="medical" compact title="正在加载变化趋势" />;
  }
  const meta = source(summary?.meta);
  const comparableCount = Number(meta?.comparable_count || 0);
  const timeline = list(summary?.timeline);
  const current = source(summary?.current);
  const previous = source(summary?.previous);
  const points = timeline.slice(-5).map((item) => ({
    label: formatChartDateLabel(item.submitted_at),
    fullLabel: String(item.submitted_at || ""),
    value: Number(item.total_score || 0),
  }));
  const totalDelta = current && previous
    ? Number(current.total_score || 0) - Number(previous.total_score || 0)
    : 0;
  const factorChanges = list(summary?.factor_changes).length
    ? list(summary?.factor_changes)
    : list(summary?.factor_trends).map((trend) => {
      const trendPoints = list(trend.points);
      if (trendPoints.length < 2) return null;
      const previousPoint = trendPoints[trendPoints.length - 2];
      const currentPoint = trendPoints[trendPoints.length - 1];
      const matched = factors.find((factor) => factor.factorCode === trend.factor_code);
      return {
        factor_code: trend.factor_code,
        factor_name: trend.factor_name,
        previous_score: Number(previousPoint.score || 0),
        current_score: Number(currentPoint.score || 0),
        delta: Number(currentPoint.score || 0) - Number(previousPoint.score || 0),
        risk_level: currentPoint.risk_level || matched?.riskLevel || "normal",
      } as Source;
    }).filter((item): item is Source => Boolean(item));

  return (
    <View className="trend-summary-card">
      <View className="trend-summary-header">
        <View>
          <Text className="trend-summary-title">变化趋势</Text>
          <Text className="trend-summary-subtitle">只对比同一量表、同一版本的历史记录</Text>
        </View>
        {assessmentId && testeeId && comparableCount >= 2 ? (
          <View
            className="trend-summary-link"
            role="button"
            onClick={() => Taro.navigateTo({ url: routes.assessmentReportTrend({ aid: assessmentId, t: testeeId }) })}
          >
            <Text className="trend-summary-link__text">查看完整趋势</Text>
          </View>
        ) : null}
      </View>
      {comparableCount >= 2 ? (
        <View className="trend-summary-content">
          <View className="trend-summary-metrics">
            <View className="trend-metric-card">
              <Text className="trend-metric-card__label">总分较上次</Text>
              <Text className="trend-metric-card__value">{previous ? formatReportDelta(totalDelta) : "暂无上次记录"}</Text>
              {previous ? <Text className="trend-metric-card__detail">{String(previous.total_score ?? "")} → {String(current?.total_score ?? "")}</Text> : null}
            </View>
            <View className="trend-metric-card">
              <Text className="trend-metric-card__label">风险等级变化</Text>
              <View className="trend-metric-card__risk-row">
                <RiskTag riskLevel={String(previous?.risk_level || "normal")} />
                <Text className="trend-metric-card__arrow">→</Text>
                <RiskTag riskLevel={String(current?.risk_level || riskLevel || "normal")} />
              </View>
              <Text className="trend-metric-card__detail">
                {previous?.risk_level === current?.risk_level ? "等级持平" : "等级发生变化"}
              </Text>
            </View>
          </View>
          {factorChanges.slice(0, 3).length ? (
            <View className="trend-factor-grid">
              {factorChanges.slice(0, 3).map((factor, index) => (
                <View key={String(factor.factor_code || index)} className="trend-factor-card">
                  <Text className="trend-factor-card__title">{String(factor.factor_name || "")}</Text>
                  <View className="trend-factor-card__meta">
                    <RiskTag riskLevel={String(factor.risk_level || "normal")} />
                    <Text className="trend-factor-card__delta">{formatReportDelta(Number(factor.delta || 0))}</Text>
                  </View>
                  <Text className="trend-factor-card__detail">{String(factor.previous_score ?? "")} → {String(factor.current_score ?? "")}</Text>
                </View>
              ))}
            </View>
          ) : null}
          <View className="trend-chart-panel">
            <Text className="trend-chart-panel__title">最近趋势</Text>
            <TypedTrendLineChart chartId="analysis-summary-trend" points={points} lineColor="#2563EB" areaColor="rgba(37, 99, 235, 0.12)" height="280rpx" />
          </View>
        </View>
      ) : (
        <View className="trend-summary-empty">
          <Text className="trend-summary-empty__title">趋势暂未形成</Text>
          <Text className="trend-summary-empty__text">{String(meta?.note || "完成 2 次同量表测评后可查看变化趋势。")}</Text>
        </View>
      )}
    </View>
  );
};

export default MedicalReportTrendSummary;
