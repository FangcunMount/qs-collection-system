import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Text, View } from "@tarojs/components";
import Taro, { useDidHide, useDidShow } from "@tarojs/taro";
import { getSessionRevision, onSessionCleared } from "@/shared/stores/sessionPrivacy";

import TrendLineChart from "@/modules/assessment/components/report/TrendLineChart";
import { calculateReportDelta, formatReportDelta, formatReportScore, parseReportScore } from "@/modules/assessment/lib/reportTrend";
import { routes } from "@/shared/config/routes";
import { formatChartDateLabel, formatSimpleDate } from "@/shared/lib/dateFormatters";
import PageShell from "@/shared/ui/PageShell";
import SectionHeader from "@/shared/ui/SectionHeader";
import StatePanel from "@/shared/ui/StatePanel";
import ActionButton from "@/shared/ui/ActionButton";
import FilterChip from "@/shared/ui/FilterChip";
import { PrivacyAuthorization } from "@/shared/ui/PrivacyAuthorization";
import RiskTag from "@/shared/ui/RiskTag";
import SurfaceCard from "@/shared/ui/SurfaceCard";
import { getAssessmentTrendSummary } from "@/services/api/assessments";
import "./AssessmentReportTrendPage.less";

interface TrendTimelineItem {
  assessment_id: string;
  submitted_at: string;
  total_score: number | string;
  risk_level: string;
}

interface FactorTrendPoint {
  submitted_at: string;
  score: number | string;
}

interface FactorTrend {
  factor_code: string;
  factor_name: string;
  points: FactorTrendPoint[];
}

interface FactorChange {
  factor_code: string;
  previous_score: number | string;
  current_score: number | string;
  delta: number;
  risk_level: string;
}

interface TrendAssessment {
  scale_name?: string;
  submitted_at: string;
  total_score: number | string;
}

interface TrendSummary {
  current?: TrendAssessment;
  previous?: TrendAssessment;
  timeline?: TrendTimelineItem[];
  factor_trends?: FactorTrend[];
  factor_changes?: FactorChange[];
  meta?: {
    comparable_count?: number | string;
    note?: string;
  };
}

interface ChartPoint {
  label: string;
  fullLabel: string;
  value: number | null;
}

const TypedTrendLineChart = TrendLineChart as React.ComponentType<{
  chartId: string;
  points: ChartPoint[];
  lineColor: string;
  areaColor: string;
  height: string;
}>;

const getErrorMessage = (error: unknown): string => (
  error instanceof Error ? error.message : "加载趋势失败，请稍后重试"
);

const AssessmentReportTrendPage = () => {
  const params = Taro.getCurrentInstance().router?.params || {};
  const assessmentId = String(params.aid || "");
  const testeeId = String(params.t || "");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [summary, setSummary] = useState<TrendSummary | null>(null);
  const [selectedFactorCode, setSelectedFactorCode] = useState("");

  const requestVersion = useRef(0);
  const reloadOnShow = useRef(false);
  useEffect(() => onSessionCleared(() => {
    reloadOnShow.current = false;
    requestVersion.current += 1;
    setSummary(null);
    setSelectedFactorCode("");
    setLoading(false);
    setErrorMessage("登录状态已变化，请重新打开报告。");
  }), []);

  const fetchSummary = useCallback(async () => {
    const version = ++requestVersion.current;
    const session = getSessionRevision();
    const isCurrent = () => version === requestVersion.current && session === getSessionRevision();
    setSummary(null);
    if (!assessmentId || !testeeId) {
      setErrorMessage("缺少测评或受测者参数，无法加载趋势。");
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMessage("");
    try {
      const result = await getAssessmentTrendSummary(assessmentId, testeeId) as unknown;
      if (!isCurrent()) return;
      const wrapped = result && typeof result === "object"
        ? result as { data?: TrendSummary }
        : null;
      const data = wrapped && "data" in wrapped
        ? wrapped.data
        : result as TrendSummary | null;
      setSummary(data || null);
    } catch (error: unknown) {
      if (!isCurrent()) return;
      console.error("[analysis/trend] 获取趋势摘要失败:", error);
      setErrorMessage(getErrorMessage(error));
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [assessmentId, testeeId]);

  useDidHide(() => {
    requestVersion.current += 1;
    reloadOnShow.current = true;
  });
  useDidShow(() => {
    if (!reloadOnShow.current) return;
    reloadOnShow.current = false;
    void fetchSummary();
  });

  useEffect(() => {
    void fetchSummary();
    return () => { requestVersion.current += 1; };
  }, [fetchSummary]);

  useEffect(() => {
    const factors = summary?.factor_trends || [];
    if (!factors.length) {
      setSelectedFactorCode("");
      return;
    }
    setSelectedFactorCode((current) => (
      factors.some((factor) => factor.factor_code === current)
        ? current
        : factors[0].factor_code
    ));
  }, [summary]);

  const timeline = useMemo(() => summary?.timeline || [], [summary]);
  const current = summary?.current;
  const previous = summary?.previous;
  const comparableCount = Number(summary?.meta?.comparable_count || 0);
  const selectedFactor = useMemo(() => {
    const factors = summary?.factor_trends || [];
    return factors.find((factor) => factor.factor_code === selectedFactorCode) || factors[0];
  }, [selectedFactorCode, summary]);

  const totalTrendPoints = useMemo<ChartPoint[]>(() => timeline.map((item) => ({
    label: formatChartDateLabel(item.submitted_at),
    fullLabel: item.submitted_at,
    value: parseReportScore(item.total_score),
  })), [timeline]);

  const factorTrendPoints = useMemo<ChartPoint[]>(() => (
    (selectedFactor?.points || []).map((item) => ({
      label: formatChartDateLabel(item.submitted_at),
      fullLabel: item.submitted_at,
      value: parseReportScore(item.score),
    }))
  ), [selectedFactor]);

  const rangeLabel = useMemo(() => {
    if (!timeline.length) return "";
    return `${formatSimpleDate(timeline[0].submitted_at)} - ${formatSimpleDate(timeline[timeline.length - 1].submitted_at)}`;
  }, [timeline]);

  const stateContent = loading ? (
    <StatePanel state="loading" tone="medical" title="正在加载变化趋势" />
  ) : errorMessage ? (
    <StatePanel
      state="error"
      tone="medical"
      title="趋势加载失败"
      description={errorMessage}
      actionText={assessmentId && testeeId ? "重新加载" : undefined}
      onAction={assessmentId && testeeId ? fetchSummary : undefined}
    />
  ) : !summary || !current ? (
    <StatePanel
      state="empty"
      tone="medical"
      title="暂无趋势数据"
      description="当前报告暂时无法生成趋势摘要，请稍后再试。"
      actionText="重新加载"
      onAction={fetchSummary}
    />
  ) : null;

  return (
    <>
      <PrivacyAuthorization />
      <PageShell tone="medical" contentClassName="analysis-trend-page">
        {stateContent || (current ? (
          <>
            <SurfaceCard tone="medical" className="trend-header-card">
              <Text className="trend-page-title">{current.scale_name || "量表变化趋势"}</Text>
              <View className="trend-header-meta">
                <Text className="trend-header-meta__item">最近一次 · {formatSimpleDate(current.submitted_at)}</Text>
                <Text className="trend-header-meta__item">累计 {comparableCount} 次同量表记录</Text>
                {rangeLabel ? <Text className="trend-header-meta__item">时间范围 · {rangeLabel}</Text> : null}
              </View>
              {summary?.meta?.note ? <Text className="trend-header-note">{summary.meta.note}</Text> : null}
            </SurfaceCard>

            {comparableCount < 2 ? (
              <SurfaceCard className="trend-empty-card">
                <StatePanel
                  state="empty"
                  tone="medical"
                  compact
                  title="趋势暂未形成"
                  description={summary?.meta?.note || "完成 2 次同量表测评后可查看趋势。"}
                />
              </SurfaceCard>
            ) : (
              <>
                <SurfaceCard className="trend-section-card">
                  <SectionHeader
                    tone="medical"
                    title="总分趋势"
                    description={previous
                      ? `较上次 ${formatReportDelta(calculateReportDelta(current.total_score, previous.total_score))}`
                      : "暂无上次记录"}
                  />
                  <Text className="trend-header-note">缺失分数保留为空缺；分数升降需结合量表结论理解。</Text>
                  <TypedTrendLineChart
                    chartId="analysis-total-trend"
                    points={totalTrendPoints}
                    lineColor="#2F80ED"
                    areaColor="rgba(47, 128, 237, 0.12)"
                    height="360rpx"
                  />
                </SurfaceCard>

                <SurfaceCard className="trend-section-card">
                  <SectionHeader tone="medical" title="风险等级时间轴" description="仅展示同一量表同版本记录" />
                  <View className="risk-timeline">
                    {timeline.map((item) => (
                      <View key={item.assessment_id} className="risk-timeline-item">
                        <Text className="risk-timeline-item__date">{formatSimpleDate(item.submitted_at)}</Text>
                        <RiskTag riskLevel={item.risk_level} />
                      </View>
                    ))}
                  </View>
                </SurfaceCard>

                <SurfaceCard className="trend-section-card">
                  <SectionHeader tone="medical" title="关键因子趋势" description="一次只看一个因子，避免信息拥挤" />
                  <View className="factor-selector">
                    {(summary.factor_trends || []).map((factor) => (
                      <FilterChip
                        key={factor.factor_code}
                        tone="medical"
                        selected={selectedFactorCode === factor.factor_code}
                        onClick={() => setSelectedFactorCode(factor.factor_code)}
                      >
                        {factor.factor_name}
                      </FilterChip>
                    ))}
                  </View>
                  {selectedFactor ? (
                    <>
                      <View className="selected-factor-summary">
                        <Text className="selected-factor-summary__title">{selectedFactor.factor_name}</Text>
                        {(() => {
                          const change = (summary.factor_changes || []).find(
                            (item) => item.factor_code === selectedFactor.factor_code,
                          );
                          if (!change) return null;
                          return (
                            <View className="selected-factor-summary__meta">
                              <RiskTag riskLevel={change.risk_level} />
                              <Text className="selected-factor-summary__delta">{formatReportDelta(change.delta)}</Text>
                              <Text className="selected-factor-summary__score">
                                {formatReportScore(change.previous_score)} → {formatReportScore(change.current_score)}
                              </Text>
                            </View>
                          );
                        })()}
                      </View>
                      <TypedTrendLineChart
                        chartId="analysis-factor-trend"
                        points={factorTrendPoints}
                        lineColor="#FF8A00"
                        areaColor="rgba(255, 138, 0, 0.12)"
                        height="320rpx"
                      />
                    </>
                  ) : (
                    <StatePanel state="empty" tone="medical" compact title="暂无因子趋势" />
                  )}
                </SurfaceCard>

                <SurfaceCard className="trend-section-card">
                  <SectionHeader tone="medical" title="历史记录" description="可回看对应报告" />
                  <View className="history-list">
                    {timeline.map((item) => (
                      <View key={item.assessment_id} className="history-list-item">
                        <View className="history-list-item__main">
                          <Text className="history-list-item__time">{formatSimpleDate(item.submitted_at)}</Text>
                          <View className="history-list-item__tags">
                            <RiskTag riskLevel={item.risk_level} />
                            <Text className="history-list-item__score">总分 {formatReportScore(item.total_score)}</Text>
                          </View>
                        </View>
                        <ActionButton
                          variant="ghost"
                          tone="medical"
                          className="history-list-item__action"
                          onClick={() => Taro.navigateTo({
                            url: routes.assessmentReport({ aid: item.assessment_id, t: testeeId }),
                          })}
                        >
                          查看报告
                        </ActionButton>
                      </View>
                    ))}
                  </View>
                </SurfaceCard>
              </>
            )}
          </>
        ) : null)}
      </PageShell>
    </>
  );
};

export default AssessmentReportTrendPage;
