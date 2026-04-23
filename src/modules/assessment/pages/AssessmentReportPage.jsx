import React, { useEffect, useState, useCallback } from "react";
import { View, Text, Button } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { AtActivityIndicator } from "taro-ui";

import { getAssessmentReport } from "@/services/api/assessmentReports";
import { getAssessmentByAnswersheetId, getAssessmentTrendSummary } from "@/services/api/assessments";
import { getLogger } from "@/shared/lib/logger";
import { getAssessmentEntryContext } from "@/shared/stores/assessmentEntry";
import { findTesteeById, getSelectedTesteeId } from "@/shared/stores/testees";
import RiskTag from "@/shared/ui/RiskTag";
import { PrivacyAuthorization } from "@/shared/ui/PrivacyAuthorization";
import PlanSubscribeConfirm from "@/shared/ui/PlanSubscribeConfirm";
import { routes } from "@/shared/config/routes";
import { getRiskConfig } from "@/shared/lib/statusFormatters";
import { formatChartDateLabel, formatSimpleDate } from "@/shared/lib/dateFormatters";
import RadarChart from "../components/report/RadarChart";
import FactorBarChart from "../components/report/FactorBarChart";
import FactorScatterChart from "../components/report/FactorScatterChart";
import TrendLineChart from "../components/report/TrendLineChart";
import "./AssessmentReportPage.less";

const PAGE_NAME = "analysis";
const logger = getLogger(PAGE_NAME);

const getDeltaDirection = (delta) => {
  if (Math.abs(delta) < 0.01) return "flat";
  return delta > 0 ? "up" : "down";
};

const formatDelta = (delta) => {
  const direction = getDeltaDirection(delta);
  if (direction === "flat") return "持平";
  return `${direction === "up" ? "上升" : "下降"} ${Math.abs(delta).toFixed(1)} 分`;
};

const Analysis = () => {
  const [total, setTotal] = useState(null);
  const [factors, setFactors] = useState([]);
  const [answersheetid, setAnswersheetid] = useState(-1);
  const [assessmentContext, setAssessmentContext] = useState({
    assessment_id: "",
    testee_id: "",
  });
  const [trendSummary, setTrendSummary] = useState(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const [reportInfo, setReportInfo] = useState({
    scale_name: '',
    scale_code: '',
    risk_level: '',
    suggestions: [],
    created_at: '',
    testee_name: '',
    testee_id: ''
  });

  const [isReady, setIsReady] = useState(false);
  const [activeTab, setActiveTab] = useState('factor-analysis'); // 'factor-analysis' or 'pro-advice'
  const [chartType, setChartType] = useState('radar'); // 'radar' | 'bar' | 'scatter'
  const [entryContext] = useState(() => getAssessmentEntryContext());
  const routeParams = Taro.getCurrentInstance().router.params || {};
  const planTaskId = routeParams.task_id || '';

  /**
   * 处理报告数据
   */
  const handleReportData = useCallback((result) => {
    logger.RUN('[Analysis] 原始报告数据:', result);
    
    const reportData = result.data || result;
    
    // 保存报告基本信息
    // 确保 suggestions 是数组，并且每个 suggestion 的 content 是字符串
    const suggestions = Array.isArray(reportData.suggestions) 
      ? reportData.suggestions.map(s => ({
          category: s.category || '',
          content: typeof s.content === 'string' ? s.content : String(s.content || ''),
          factor_code: s.factor_code || undefined
        }))
      : [];
    
    // 获取受试者信息：优先使用 API 返回的，否则从 store 中获取
    let testeeName = reportData.testee_name || '';
    let testeeId = reportData.testee_id || '';
    
    if (!testeeName) {
      // 尝试从 store 中获取
      const selectedTesteeId = getSelectedTesteeId();
      if (selectedTesteeId) {
        const testee = findTesteeById(selectedTesteeId);
        if (testee) {
          testeeName = testee.legalName || testee.name || '';
          testeeId = testee.id || '';
        }
      }
    }
    
    setReportInfo({
      scale_name: reportData.scale_name || '',
      scale_code: reportData.scale_code || '',
      risk_level: reportData.risk_level || '',
      suggestions: suggestions,
      created_at: reportData.created_at || '',
      testee_name: testeeName,
      testee_id: testeeId
    });
    
    // 映射总分数据
    if (reportData.conclusion) {
      setTotal({
        content: reportData.conclusion,
        score: reportData.total_score
      });
    } else {
      setTotal(null);
    }
    
    // 映射因子维度数据（适配新接口结构）
    // 注意：根据 API 文档，dimension.suggestion 是字符串，不是数组
    const mappedFactors = (reportData.dimensions || []).map(dimension => ({
      factor_code: dimension.factor_code,
      title: dimension.factor_name,
      content: dimension.description,
      score: dimension.raw_score,
      max_score: dimension.max_score,
      risk_level: dimension.risk_level,
      suggestion: dimension.suggestion || '' // 维度级别的建议（字符串）
    }));
    setFactors(mappedFactors);
    
    logger.RUN('[Analysis] 映射后数据:', { 
      reportInfo: {
        scale_name: reportData.scale_name,
        scale_code: reportData.scale_code,
        risk_level: reportData.risk_level,
        suggestions: reportData.suggestions
      },
      total: { content: reportData.conclusion, score: reportData.total_score }, 
      factors: mappedFactors 
    });
  }, []);

  const loadTrendSummary = useCallback(async (assessmentId, testeeId) => {
    if (!assessmentId || !testeeId) {
      setTrendSummary(null);
      return;
    }

    setTrendSummary(null);
    setTrendLoading(true);
    try {
      const result = await getAssessmentTrendSummary(assessmentId, testeeId);
      setTrendSummary(result?.data || result || null);
    } catch (error) {
      logger.ERROR("[Analysis] 获取趋势摘要失败:", error);
      setTrendSummary(null);
    } finally {
      setTrendLoading(false);
    }
  }, []);

  /**
   * 根据测评ID和受试者ID获取分析报告
   */
  const initAnalysisByAssessmentId = useCallback((assessmentId, testeeId) => {
    if (!assessmentId || !testeeId) {
      logger.ERROR('[Analysis] 缺少必要参数:', { assessmentId, testeeId });
      Taro.showToast({
        title: '参数不完整',
        icon: 'none'
      });
      return;
    }

    let loadingShown = false;
    try {
      Taro.showLoading({ title: '加载中...' });
      loadingShown = true;
    } catch (e) {
      // 忽略 showLoading 错误
    }

    setAssessmentContext({
      assessment_id: String(assessmentId),
      testee_id: String(testeeId),
    });

    getAssessmentReport(assessmentId, testeeId)
      .then(result => {
        logger.RUN('[Analysis] 获取测评报告成功:', { assessmentId });
        handleReportData(result);
        loadTrendSummary(assessmentId, testeeId);
        setIsReady(true);
      })
      .catch(err => {
        logger.ERROR('[Analysis] 获取测评报告失败:', err);
        Taro.showToast({
          title: '加载分析报告失败',
          icon: 'none'
        });
        setIsReady(true);
      })
      .finally(() => {
        if (loadingShown) {
          try {
            Taro.hideLoading();
          } catch (e) {
            // 忽略 hideLoading 错误
          }
        }
      });
  }, [handleReportData, loadTrendSummary]);

  /**
   * 根据答卷ID获取分析报告
   */
  const initAnalysisByAnswersheetId = useCallback(async (answersheetId) => {
    setAnswersheetid(answersheetId);
    
    let loadingShown = false;
    try {
      Taro.showLoading({ title: '加载中...' });
      loadingShown = true;
    } catch (e) {
      // 忽略 showLoading 错误
    }
    
    try {
      logger.RUN('[Analysis] 通过答卷ID获取报告:', { answersheetId });
      const detailResult = await getAssessmentByAnswersheetId(answersheetId);
      const detail = detailResult?.data || detailResult || {};
      const assessmentId = detail.id || '';
      const testeeId = detail.testee_id || '';

      if (!assessmentId || !testeeId) {
        throw new Error('缺少 assessment_id 或 testee_id');
      }

      setAssessmentContext({
        assessment_id: String(assessmentId),
        testee_id: String(testeeId),
      });

      const reportResult = await getAssessmentReport(assessmentId, testeeId);
      logger.RUN('[Analysis] 通过答卷ID获取报告成功');
      
      handleReportData(reportResult);
      await loadTrendSummary(assessmentId, testeeId);
      setIsReady(true);
      
    } catch (err) {
      logger.ERROR('[Analysis] 加载失败:', err);
      Taro.showToast({
        title: err?.message || '加载分析报告失败',
        icon: 'none'
      });
      setIsReady(true);
    } finally {
      if (loadingShown) {
        try {
          Taro.hideLoading();
        } catch (e) {
          // 忽略 hideLoading 错误
        }
      }
    }
  }, [handleReportData, loadTrendSummary]);

  useEffect(() => {
    const params = Taro.getCurrentInstance().router.params;
    logger.RUN("did effect <RUN> | params: ", { answersheetid: params.a, assessmentid: params.aid, reportid: params.rid });

    if (params.aid || params.rid) {
      const aid = params.aid || params.rid;
      initAnalysisByAssessmentId(aid, params.t);
    } else {
      initAnalysisByAnswersheetId(params.a);
    }
  }, [initAnalysisByAssessmentId, initAnalysisByAnswersheetId]);


  // 因子卡片组件
  const FactorCard = ({ title, score, maxScore, content, riskLevel, suggestion }) => {
    const config = getRiskConfig(riskLevel);
    const hasScore = score !== undefined && score !== null;
    const hasMax = maxScore !== undefined && maxScore !== null && maxScore > 0;
    const percent = hasScore && hasMax ? Math.min((score / maxScore) * 100, 100) : 0;
    
    return (
      <View className={`factor-card ${config.className}`}>
        <View className="factor-card-header">
          <Text className="factor-card-title">{title}</Text>
          <View className={`factor-risk-badge ${config.className}`}>
            <Text className="risk-label">{config.label}</Text>
          </View>
        </View>
        
        <View className="factor-card-body">
          {/* 进度条形式的得分展示 */}
          <View className="factor-score-progress-wrapper">
            <View className="score-progress-header">
              <Text className="score-label">因子得分</Text>
              <Text className="score-value-text">
                {hasScore ? score : '--'}
                {hasMax && <Text className="score-max-text"> / {maxScore}</Text>}
              </Text>
            </View>
            {hasMax && hasScore ? (
              <View className="score-progress-container">
                <View className="score-progress-track">
                  <View
                    className="score-progress-bar"
                    style={{
                      width: `${percent}%`,
                      backgroundColor: config.bgColor
                    }}
                  >
                    {percent >= 15 && (
                      <Text className="score-progress-text" style={{ color: config.textColor }}>
                        {Math.round(percent)}%
                      </Text>
                    )}
                  </View>
                </View>
                {percent < 15 && (
                  <Text className="score-progress-text-outside" style={{ color: config.bgColor }}>
                    {Math.round(percent)}%
                  </Text>
                )}
              </View>
            ) : (
              <View className="score-progress-container">
                <View className="score-progress-track">
                  <View className="score-progress-bar-empty" />
                </View>
                <Text className="score-progress-text-outside" style={{ color: '#9CA3AF' }}>
                  --
                </Text>
              </View>
            )}
          </View>
          {content && (
            <View className="factor-section">
              <Text className="factor-section-title">解读</Text>
              <View className="factor-content">{content}</View>
            </View>
          )}
          {suggestion && (
            <View className="factor-section">
              <Text className="factor-section-title">建议</Text>
              <View className="factor-suggestion">{suggestion}</View>
            </View>
          )}
        </View>
      </View>
    );
  };


  if (!isReady) {
    return (
      <>
        <PrivacyAuthorization />
        <AtActivityIndicator mode="center" content='加载中，请稍候...'></AtActivityIndicator>
      </>
    );
  }

  const overallRiskConfig = getRiskConfig(reportInfo.risk_level || 'normal');
  const comparableCount = Number(trendSummary?.meta?.comparable_count || 0);
  const trendTimeline = trendSummary?.timeline || [];
  const trendCurrent = trendSummary?.current || null;
  const trendPrevious = trendSummary?.previous || null;
  const recentTrendPoints = trendTimeline.slice(-5).map((item) => ({
    label: formatChartDateLabel(item.submitted_at),
    fullLabel: item.submitted_at,
    value: Number(item.total_score || 0),
  }));
  const totalDelta = trendCurrent && trendPrevious
    ? Number(trendCurrent.total_score || 0) - Number(trendPrevious.total_score || 0)
    : 0;
  const trendFactorChanges = (
    trendSummary?.factor_changes?.length
      ? trendSummary.factor_changes
      : (trendSummary?.factor_trends || []).map((factorTrend) => {
          const points = factorTrend?.points || [];
          if (points.length < 2) {
            return null;
          }

          const previousPoint = points[points.length - 2];
          const currentPoint = points[points.length - 1];
          const matchedFactor = factors.find((factor) => factor.factor_code === factorTrend.factor_code);
          const previousScore = Number(previousPoint?.score || 0);
          const currentScore = Number(currentPoint?.score || 0);

          return {
            factor_code: factorTrend.factor_code,
            factor_name: factorTrend.factor_name,
            previous_score: previousScore,
            current_score: currentScore,
            delta: currentScore - previousScore,
            risk_level: currentPoint?.risk_level || matchedFactor?.risk_level || "normal",
          };
        }).filter(Boolean)
  ).slice(0, 3);
  const canOpenTrendDetail = Boolean(assessmentContext.assessment_id && assessmentContext.testee_id);

  return (
    <>
      <PrivacyAuthorization />
      
      <View className="analysis-report-page">
        {/* 报告概览卡片 */}
        <View className="report-overview-card">
          <View className="report-header">
            <Text className="report-title">{reportInfo.scale_name || '量表测评报告'}</Text>
            {reportInfo.testee_name && (
              <Text className="report-testee">{reportInfo.testee_name}</Text>
            )}
          </View>
          {reportInfo.created_at && (
            <View className="report-context">
              {reportInfo.created_at && (
                <Text className="report-context__text">
                  生成时间 · {formatSimpleDate(reportInfo.created_at)}
                </Text>
              )}
            </View>
          )}

          {/* 总分展示区 */}
          <View
            className="score-display-area"
            style={{
              background: overallRiskConfig.scoreBadgeBg ? overallRiskConfig.scoreBadgeBg : undefined
            }}
          >
            <View
              className="score-number"
              style={{
                color: overallRiskConfig.scoreBadgeColor || undefined
              }}
            >
              <Text className="score-main">{total?.score || 0}</Text>
              <Text className="score-unit">分</Text>
            </View>
            <View
              className="risk-level-badge"
              style={{
                backgroundColor: '#FFFFFF',
                color: overallRiskConfig.scoreBadgeColor || '#F97316'
              }}
            >
              <Text className="risk-level-text">
                {overallRiskConfig.label}
                {total?.content && `:${total.content}`}
              </Text>
            </View>

            {/* 建议展示区 */}
            {(Array.isArray(reportInfo.suggestions) && reportInfo.suggestions.length > 0) && (
              <View className="suggestion-section">
                <Text className="suggestion-content-text">
                  {typeof reportInfo.suggestions[0].content === 'string' 
                    ? reportInfo.suggestions[0].content 
                    : String(reportInfo.suggestions[0].content || '')}
                </Text>
              </View>
            )}
          </View>
        </View>

        <PlanSubscribeConfirm
          taskId={planTaskId}
          planName={entryContext?.plan_name}
          entryTitle={entryContext?.entry_title || reportInfo.scale_name}
          clinicianName={entryContext?.clinician_name}
          entryContext={entryContext}
          variant="floating"
        />

        <View className="trend-summary-card">
          <View className="trend-summary-header">
            <View>
              <Text className="trend-summary-title">变化趋势</Text>
              <Text className="trend-summary-subtitle">只对比同一量表、同一版本的历史记录</Text>
            </View>
            {canOpenTrendDetail && comparableCount >= 2 && (
              <View
                className="trend-summary-link"
                onClick={() => {
                  Taro.navigateTo({
                    url: routes.assessmentReportTrend({
                      aid: assessmentContext.assessment_id,
                      t: assessmentContext.testee_id,
                    }),
                  });
                }}
              >
                <Text className="trend-summary-link__text">查看完整趋势</Text>
              </View>
            )}
          </View>

          {trendLoading ? (
            <AtActivityIndicator mode="center" content="加载趋势中..." />
          ) : comparableCount >= 2 ? (
            <View className="trend-summary-content">
              <View className="trend-summary-metrics">
                <View className="trend-metric-card">
                  <Text className="trend-metric-card__label">总分较上次</Text>
                  <Text className="trend-metric-card__value">
                    {trendPrevious ? formatDelta(totalDelta) : "暂无上次记录"}
                  </Text>
                  {trendPrevious && (
                    <Text className="trend-metric-card__detail">
                      {trendPrevious.total_score} → {trendCurrent?.total_score}
                    </Text>
                  )}
                </View>
                <View className="trend-metric-card">
                  <Text className="trend-metric-card__label">风险等级变化</Text>
                  <View className="trend-metric-card__risk-row">
                    <RiskTag riskLevel={trendPrevious?.risk_level || "normal"} />
                    <Text className="trend-metric-card__arrow">→</Text>
                    <RiskTag riskLevel={trendCurrent?.risk_level || reportInfo.risk_level || "normal"} />
                  </View>
                  <Text className="trend-metric-card__detail">
                    {trendPrevious?.risk_level === trendCurrent?.risk_level ? "等级持平" : "等级发生变化"}
                  </Text>
                </View>
              </View>

              {trendFactorChanges.length > 0 && (
                <View className="trend-factor-grid">
                  {trendFactorChanges.map((factor) => (
                    <View key={factor.factor_code} className="trend-factor-card">
                      <Text className="trend-factor-card__title">{factor.factor_name}</Text>
                      <View className="trend-factor-card__meta">
                        <RiskTag riskLevel={factor.risk_level} />
                        <Text className="trend-factor-card__delta">{formatDelta(Number(factor.delta || 0))}</Text>
                      </View>
                      <Text className="trend-factor-card__detail">
                        {factor.previous_score} → {factor.current_score}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <View className="trend-chart-panel">
                <Text className="trend-chart-panel__title">最近趋势</Text>
                <TrendLineChart
                  chartId="analysis-summary-trend"
                  points={recentTrendPoints}
                  lineColor="#2563EB"
                  areaColor="rgba(37, 99, 235, 0.12)"
                  height="280rpx"
                />
              </View>
            </View>
          ) : (
            <View className="trend-summary-empty">
              <Text className="trend-summary-empty__title">趋势暂未形成</Text>
              <Text className="trend-summary-empty__text">
                {trendSummary?.meta?.note || "完成 2 次同量表测评后可查看变化趋势。"}
              </Text>
            </View>
          )}
        </View>

        {/* 标签页控制器 */}
        <View className="tab-controller">
          <View className="tab-buttons">
            <View 
              className={`tab-button ${activeTab === 'factor-analysis' ? 'active' : ''}`}
              onClick={() => setActiveTab('factor-analysis')}
            >
              <Text className="tab-button-text">因子分析</Text>
            </View>
            <View 
              className={`tab-button ${activeTab === 'pro-advice' ? 'active' : ''}`}
              onClick={() => setActiveTab('pro-advice')}
            >
              <Text className="tab-button-text">详细建议</Text>
            </View>
          </View>
        </View>

        {/* 内容区 */}
        <View className="tab-content-area">
          {/* 因子分析页 */}
          {activeTab === 'factor-analysis' && (
            <View className="factor-analysis-content">
              {/* 雷达图卡片 */}
              {factors.length > 0 && (
                <View className="factor-chart-card">
                  <View className="chart-header">
                    <Text className="card-title">因子维度分布</Text>
                    <View className="chart-toggle">
                      <View
                        className={`chart-toggle-button ${chartType === 'radar' ? 'active' : ''}`}
                        onClick={() => setChartType('radar')}
                      >
                        <Text className="chart-toggle-text">雷达图</Text>
                      </View>
                      <View
                        className={`chart-toggle-button ${chartType === 'bar' ? 'active' : ''}`}
                        onClick={() => setChartType('bar')}
                      >
                        <Text className="chart-toggle-text">条形图</Text>
                      </View>
                      <View
                        className={`chart-toggle-button ${chartType === 'scatter' ? 'active' : ''}`}
                        onClick={() => setChartType('scatter')}
                      >
                        <Text className="chart-toggle-text">散点图</Text>
                      </View>
                    </View>
                  </View>
                  {chartType === 'radar' ? (
                    <View className="radar-chart-container">
                      <RadarChart data={factors} />
                    </View>
                  ) : chartType === 'bar' ? (
                    <View className="bar-chart-container">
                      <FactorBarChart data={factors} />
                    </View>
                  ) : (
                    <View className="scatter-chart-container">
                      <FactorScatterChart data={factors} />
                    </View>
                  )}
                </View>
              )}

              {factors.length === 0 && (
                <View className="empty-state">
                  <Text className="empty-icon">📊</Text>
                  <Text className="empty-text">暂无因子分析数据</Text>
                </View>
              )}
            </View>
          )}

          {/* 详细建议页 */}
          {activeTab === 'pro-advice' && (
            <View className="pro-advice-content">
              <View className="factor-cards-list">
                {factors.map((factor, index) => (
                  <FactorCard
                    key={factor.factor_code || index}
                    title={factor.title}
                    score={factor.score}
                    maxScore={factor.max_score}
                    content={factor.content}
                    riskLevel={factor.risk_level}
                    suggestion={factor.suggestion}
                  />
                ))}
              </View>

            </View>
          )}
        </View>

        {/* 底部操作按钮 */}
        <View className="action-buttons">
          <Button 
            className="primary-button"
              onClick={() => {
                Taro.redirectTo({
                  url: routes.assessmentResponse({
                    a: answersheetid,
                    task_id: planTaskId || undefined,
                  })
                });
              }}
          >
            完成并查看测评记录
          </Button>
        </View>
      </View>
    </>
  );
};

export default Analysis;
