import React, { useEffect, useState, useCallback } from "react";
import { View, Text, Button } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { AtActivityIndicator, AtIcon } from "taro-ui";

import { getAssessmentReport, getAssessmentReportByAnswersheetId } from "../../services/api/analysisApi";
import { getLogger } from "../../util/log";
import { PrivacyAuthorization } from "../../components/privacyAuthorization/privacyAuthorization";
import { getRiskConfig } from "../common/utils/statusFormatters";
import { formatSimpleDate } from "../common/utils/dateFormatters";
import RadarChart from "./widget/RadarChart";
import "./index.less";

const PAGE_NAME = "analysis";
const logger = getLogger(PAGE_NAME);

const Analysis = () => {
  const [total, setTotal] = useState(null);
  const [factors, setFactors] = useState([]);
  const [answersheetid, setAnswersheetid] = useState(-1);
  const [reportInfo, setReportInfo] = useState({
    scale_name: '',
    scale_code: '',
    risk_level: '',
    suggestions: [],
    created_at: ''
  });

  const [isReady, setIsReady] = useState(false);
  const [activeTab, setActiveTab] = useState('factor-analysis'); // 'factor-analysis' or 'pro-advice'

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
    
    setReportInfo({
      scale_name: reportData.scale_name || '',
      scale_code: reportData.scale_code || '',
      risk_level: reportData.risk_level || '',
      suggestions: suggestions,
      created_at: reportData.created_at || ''
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

    getAssessmentReport(assessmentId, testeeId)
      .then(result => {
        logger.RUN('[Analysis] 获取测评报告成功:', { assessmentId });
        handleReportData(result);
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
  }, [handleReportData]);

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
      const reportResult = await getAssessmentReportByAnswersheetId(answersheetId);
      logger.RUN('[Analysis] 通过答卷ID获取报告成功');
      
      handleReportData(reportResult);
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
  }, [handleReportData]);

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
  const FactorCard = ({ title, score, maxScore, content, riskLevel }) => {
    const config = getRiskConfig(riskLevel);
    const hasScore = score !== undefined && score !== null;
    const hasMax = maxScore !== undefined && maxScore !== null && maxScore > 0;
    const percent = hasScore && hasMax ? Math.min((score / maxScore) * 100, 100) : 0;
    
    return (
      <View className="factor-card">
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
            <View className="factor-content">{content}</View>
          )}
        </View>
      </View>
    );
  };

  // 根据建议类别获取配置
  const getSuggestionConfig = (category) => {
    const configMap = {
      'general': {
        icon: 'settings',
        title: '总体建议',
        bgColor: '#E6F4FF',
        iconColor: '#1890FF',
      },
      'family': {
        icon: 'user',
        title: '家庭维度建议',
        bgColor: '#FFF7E6',
        iconColor: '#FA8C16',
      },
      'dimension': {
        icon: 'analytics',
        title: '因子维度建议',
        bgColor: '#F6FFED',
        iconColor: '#52C41A',
      },
      'lifestyle': {
        icon: 'home',
        title: '生活调整建议',
        bgColor: '#F0F5FF',
        iconColor: '#722ED1',
      },
      'professional': {
        icon: 'user',
        title: '专业咨询建议',
        bgColor: '#FFF7E6',
        iconColor: '#FA8C16',
      },
      'monitoring': {
        icon: 'analytics',
        title: '后续监测建议',
        bgColor: '#F6FFED',
        iconColor: '#52C41A',
      },
    };
    return configMap[category] || {
      icon: 'info',
      title: '建议',
      bgColor: '#F5F5F5',
      iconColor: '#8C8C8C',
    };
  };

  // 建议项组件
  const SuggestionItem = ({ icon, title, content, bgColor, iconColor }) => {
    return (
      <View 
        className="suggestion-item"
        style={{ color: iconColor }}
      >
        <View 
          className="suggestion-icon"
          style={{ background: bgColor }}
        >
          <AtIcon value={icon} size="24" color={iconColor} />
        </View>
        <View className="suggestion-content">
          <Text className="suggestion-title">{title}</Text>
          <Text className="suggestion-text">{content}</Text>
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

  return (
    <>
      <PrivacyAuthorization />
      
      <View className="analysis-report-page">
        {/* 报告概览卡片 */}
        <View className="report-overview-card">
          <View className="report-header">
            <Text className="report-title">{reportInfo.scale_name || 'SNAP-IV量表测评报告'}</Text>
            <Text className="report-date">{formatSimpleDate(reportInfo.created_at)}</Text>
          </View>

          {/* 总分展示区 */}
          <View className="score-display-area">
            <View className="score-number">
              <Text className="score-main">{total?.score || 0}</Text>
              <Text className="score-unit">分</Text>
            </View>
            <View className="risk-level-badge">
              <Text>{overallRiskConfig.label}：{total?.content || '存在轻度注意缺陷倾向'}</Text>
            </View>
            <Text className="score-description">
              {Array.isArray(reportInfo.suggestions) && reportInfo.suggestions.length > 0 
                ? (typeof reportInfo.suggestions[0].content === 'string' 
                    ? reportInfo.suggestions[0].content 
                    : String(reportInfo.suggestions[0].content || ''))
                : '您的得分水平高于常模参考值，建议关注日常行为表现并进行专业临床访谈。'}
            </Text>
          </View>
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
                <View className="radar-chart-card">
                  <Text className="card-title">因子维度分布</Text>
                  <View className="radar-chart-container">
                    <RadarChart data={factors} />
                  </View>
                </View>
              )}

              {/* 因子卡片列表 */}
              <View className="factor-cards-list">
                {factors.map((factor, index) => (
                  <FactorCard
                    key={factor.factor_code || index}
                    title={factor.title}
                    score={factor.score}
                    maxScore={factor.max_score}
                    content={factor.content}
                    riskLevel={factor.risk_level}
                  />
                ))}
              </View>

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
              <View className="suggestions-list">
                {/* 显示其他类别的建议（不包括 general 类别） */}
                {Array.isArray(reportInfo.suggestions) && reportInfo.suggestions
                  .filter(suggestion => suggestion && suggestion.category !== 'general')
                  .map((suggestion, index) => {
                    const config = getSuggestionConfig(suggestion.category);
                    const content = typeof suggestion.content === 'string' 
                      ? suggestion.content 
                      : String(suggestion.content || '');
                    // 如果是 dimension 类别，显示因子名称
                    const title = suggestion.category === 'dimension' && suggestion.factor_code
                      ? factors.find(f => f.factor_code === suggestion.factor_code)?.title + ' - ' + config.title
                      : config.title;
                    return (
                      <SuggestionItem
                        key={`${suggestion.category}-${suggestion.factor_code || index}`}
                        icon={config.icon}
                        title={title}
                        content={content}
                        bgColor={config.bgColor}
                        iconColor={config.iconColor}
                      />
                    );
                  })}
                
                {/* 如果没有建议，显示空状态 */}
                {(!Array.isArray(reportInfo.suggestions) || 
                  reportInfo.suggestions.filter(s => s && s.category !== 'general').length === 0) && (
                  <View className="empty-state">
                    <Text className="empty-icon">💡</Text>
                    <Text className="empty-text">暂无详细建议</Text>
                  </View>
                )}
              </View>

              {/* 底部操作按钮 */}
              <View className="action-buttons">
                <Button 
                  className="primary-button"
                  onClick={() => {
                    Taro.redirectTo({
                      url: `/pages/answersheet/detail/index?a=${answersheetid}`
                    });
                  }}
                >
                  完成并查看历史记录
                </Button>
              </View>
            </View>
          )}
        </View>
      </View>
    </>
  );
};

export default Analysis;
