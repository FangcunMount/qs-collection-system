import React, { useEffect, useMemo, useState } from "react";
import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { AtActivityIndicator } from "taro-ui";
import { PrivacyAuthorization } from "../../../components/privacyAuthorization/privacyAuthorization";
import { RiskTag } from "../../../components/common";
import { getAssessmentTrendSummary } from "../../../services/api/assessmentApi";
import { formatChartDateLabel, formatSimpleDate } from "../../common/utils/dateFormatters";
import TrendLineChart from "../widget/TrendLineChart";
import "./index.less";

const getDeltaDirection = (delta) => {
  if (Math.abs(delta) < 0.01) return "flat";
  return delta > 0 ? "up" : "down";
};

const formatDelta = (delta) => {
  const direction = getDeltaDirection(delta);
  if (direction === "flat") return "持平";
  return `${direction === "up" ? "上升" : "下降"} ${Math.abs(delta).toFixed(1)} 分`;
};

const TrendPage = () => {
  const params = Taro.getCurrentInstance().router?.params || {};
  const assessmentId = params.aid || "";
  const testeeId = params.t || "";

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [selectedFactorCode, setSelectedFactorCode] = useState("");

  useEffect(() => {
    if (!assessmentId || !testeeId) {
      Taro.showToast({
        title: "缺少趋势参数",
        icon: "none",
      });
      setLoading(false);
      return;
    }

    const fetchSummary = async () => {
      try {
        const result = await getAssessmentTrendSummary(assessmentId, testeeId);
        const data = result?.data || result;
        setSummary(data || null);
      } catch (error) {
        console.error("[analysis/trend] 获取趋势摘要失败:", error);
        Taro.showToast({
          title: error?.message || "加载趋势失败",
          icon: "none",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [assessmentId, testeeId]);

  useEffect(() => {
    if (!summary?.factor_trends?.length) return;
    setSelectedFactorCode((current) => current || summary.factor_trends[0].factor_code);
  }, [summary]);

  const timeline = useMemo(() => summary?.timeline || [], [summary]);
  const current = summary?.current;
  const previous = summary?.previous;
  const comparableCount = Number(summary?.meta?.comparable_count || 0);
  const selectedFactor = useMemo(
    () => (summary?.factor_trends || []).find((item) => item.factor_code === selectedFactorCode) || summary?.factor_trends?.[0],
    [selectedFactorCode, summary],
  );

  const totalTrendPoints = useMemo(
    () =>
      timeline.map((item) => ({
        label: formatChartDateLabel(item.submitted_at),
        fullLabel: item.submitted_at,
        value: Number(item.total_score || 0),
      })),
    [timeline],
  );

  const factorTrendPoints = useMemo(
    () =>
      (selectedFactor?.points || []).map((item) => ({
        label: formatChartDateLabel(item.submitted_at),
        fullLabel: item.submitted_at,
        value: Number(item.score || 0),
      })),
    [selectedFactor],
  );

  const rangeLabel = useMemo(() => {
    if (timeline.length === 0) return "";
    const first = timeline[0];
    const last = timeline[timeline.length - 1];
    return `${formatSimpleDate(first.submitted_at)} - ${formatSimpleDate(last.submitted_at)}`;
  }, [timeline]);

  if (loading) {
    return (
      <>
        <PrivacyAuthorization />
        <AtActivityIndicator mode="center" content="加载趋势中..." />
      </>
    );
  }

  if (!summary || !current) {
    return (
      <>
        <PrivacyAuthorization />
        <View className="analysis-trend-page">
          <View className="trend-empty-card">
            <Text className="trend-empty-title">暂无趋势数据</Text>
            <Text className="trend-empty-text">当前报告暂时无法生成趋势摘要，请稍后再试。</Text>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <PrivacyAuthorization />
      <View className="analysis-trend-page">
        <View className="trend-header-card">
          <Text className="trend-page-title">{current.scale_name || "量表变化趋势"}</Text>
          <View className="trend-header-meta">
            <Text className="trend-header-meta__item">最近一次 · {formatSimpleDate(current.submitted_at)}</Text>
            <Text className="trend-header-meta__item">累计 {comparableCount} 次同量表记录</Text>
            {rangeLabel && <Text className="trend-header-meta__item">时间范围 · {rangeLabel}</Text>}
          </View>
          {summary?.meta?.note && <Text className="trend-header-note">{summary.meta.note}</Text>}
        </View>

        {comparableCount < 2 ? (
          <View className="trend-empty-card">
            <Text className="trend-empty-title">趋势暂未形成</Text>
            <Text className="trend-empty-text">{summary?.meta?.note || "完成 2 次同量表测评后可查看趋势。"}</Text>
          </View>
        ) : (
          <>
            <View className="trend-section-card">
              <View className="trend-section-header">
                <Text className="trend-section-title">总分趋势</Text>
                {previous && (
                  <Text className="trend-section-subtitle">
                    较上次 {formatDelta(Number(current.total_score || 0) - Number(previous.total_score || 0))}
                  </Text>
                )}
              </View>
              <TrendLineChart
                chartId="analysis-total-trend"
                points={totalTrendPoints}
                lineColor="#2563EB"
                areaColor="rgba(37, 99, 235, 0.12)"
                height="360rpx"
              />
            </View>

            <View className="trend-section-card">
              <View className="trend-section-header">
                <Text className="trend-section-title">风险等级时间轴</Text>
                <Text className="trend-section-subtitle">仅展示同一量表同版本记录</Text>
              </View>
              <View className="risk-timeline">
                {timeline.map((item) => (
                  <View key={item.assessment_id} className="risk-timeline-item">
                    <View className="risk-timeline-item__time">
                      <Text className="risk-timeline-item__date">{formatSimpleDate(item.submitted_at)}</Text>
                    </View>
                    <RiskTag riskLevel={item.risk_level} />
                  </View>
                ))}
              </View>
            </View>

            <View className="trend-section-card">
              <View className="trend-section-header">
                <Text className="trend-section-title">关键因子趋势</Text>
                <Text className="trend-section-subtitle">一次只看一个因子，避免信息拥挤</Text>
              </View>
              <View className="factor-selector">
                {(summary.factor_trends || []).map((factor) => (
                  <View
                    key={factor.factor_code}
                    className={`factor-selector-pill ${selectedFactorCode === factor.factor_code ? "active" : ""}`}
                    onClick={() => setSelectedFactorCode(factor.factor_code)}
                  >
                    <Text className="factor-selector-pill__text">{factor.factor_name}</Text>
                  </View>
                ))}
              </View>
              {selectedFactor && (
                <>
                  <View className="selected-factor-summary">
                    <Text className="selected-factor-summary__title">{selectedFactor.factor_name}</Text>
                    {(() => {
                      const change = (summary.factor_changes || []).find((item) => item.factor_code === selectedFactor.factor_code);
                      if (!change) return null;
                      return (
                        <View className="selected-factor-summary__meta">
                          <RiskTag riskLevel={change.risk_level} />
                          <Text className="selected-factor-summary__delta">{formatDelta(change.delta)}</Text>
                          <Text className="selected-factor-summary__score">
                            {change.previous_score} → {change.current_score}
                          </Text>
                        </View>
                      );
                    })()}
                  </View>
                  <TrendLineChart
                    chartId="analysis-factor-trend"
                    points={factorTrendPoints}
                    lineColor="#F97316"
                    areaColor="rgba(249, 115, 22, 0.12)"
                    height="320rpx"
                  />
                </>
              )}
            </View>

            <View className="trend-section-card">
              <View className="trend-section-header">
                <Text className="trend-section-title">历史记录</Text>
                <Text className="trend-section-subtitle">点击可回看对应报告</Text>
              </View>
              <View className="history-list">
                {timeline.map((item) => (
                  <View key={item.assessment_id} className="history-list-item">
                    <View className="history-list-item__main">
                      <Text className="history-list-item__time">{formatSimpleDate(item.submitted_at)}</Text>
                      <View className="history-list-item__tags">
                        <RiskTag riskLevel={item.risk_level} />
                        <Text className="history-list-item__score">总分 {item.total_score}</Text>
                      </View>
                    </View>
                    <View
                      className="history-list-item__action"
                      onClick={() => {
                        Taro.navigateTo({
                          url: `/pages/analysis/index?aid=${item.assessment_id}&t=${testeeId}`,
                        });
                      }}
                    >
                      <Text className="history-list-item__action-text">查看报告</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}
      </View>
    </>
  );
};

export default TrendPage;
