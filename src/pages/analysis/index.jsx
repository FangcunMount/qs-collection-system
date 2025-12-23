import React, { useEffect, useState, useCallback } from "react";
import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { AtButton, AtActivityIndicator, AtIcon } from "taro-ui";

import { getAssessmentReport, getAssessmentReportByAnswersheetId } from "../../services/api/analysisApi";
import PageContainer from "../../components/pageContainer/pageContainer";
import TotalAnalysisShowCard from "./widget/totalAnalysisShowCard";
import FactorAnalysisShowCard from "./widget/factorAnalysisShowCard";
import ExportImageDialog from "./widget/exportImageDialog";
import TScoreAnalysisShowCard  from "./widget/TScoreAnalysisShowCard";
import { getLogger } from "../../util/log";
import { PrivacyAuthorization } from "../../components/privacyAuthorization/privacyAuthorization";

const PAGE_NAME = "analysis";
const logger = getLogger(PAGE_NAME);

const Analysis = () => {

  const [total, setTotal] = useState(null);
  const [factors, setFactors] = useState([]);
  const [tScores, setTScores] = useState({});
  const [answersheetid, setAnswersheetid] = useState(-1);
  const [exportAnalysisFlag, setExportAnalysisFlag] = useState("");
  const [reportInfo, setReportInfo] = useState({
    scale_name: '',
    scale_code: '',
    risk_level: '',
    suggestions: [],
    created_at: ''
  });

  const [isReady, setIsReady] = useState(false);
  const [isShowTotalAndFactorAnalysisCard, setIsShowTotalAndFactorAnalysisCard] = useState(false);
  const [isShowTScoreAnalysisCard, setIsShowTScoreAnalysisCard] = useState(false);

  /**
   * 处理报告数据
   * 映射 API 字段到组件期望的字段
   * API 响应结构：{ data: AssessmentReportResponse } 或直接是 AssessmentReportResponse
   */
  const handleReportData = useCallback((result) => {
    logger.RUN('[Analysis] 原始报告数据:', result);
    
    // 处理 API 响应结构：可能是 { data: {...} } 或直接是 {...}
    const reportData = result.data || result;
    
    // 保存报告基本信息
    setReportInfo({
      scale_name: reportData.scale_name || '',
      scale_code: reportData.scale_code || '',
      risk_level: reportData.risk_level || '',
      suggestions: reportData.suggestions || [],
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
    
    // 映射因子维度数据
    // DimensionInterpretResponse: { description, factor_code, factor_name, raw_score, max_score, risk_level }
    const mappedFactors = (reportData.dimensions || []).map(dimension => ({
      factor_code: dimension.factor_code,
      title: dimension.factor_name,
      content: dimension.description,
      score: dimension.raw_score,
      max_score: dimension.max_score,
      risk_level: dimension.risk_level
    }));
    setFactors(mappedFactors);
    
    // T分数据（如果存在，但 API 文档中没有这个字段，保留兼容性）
    setTScores(reportData.t_score_interpretations || {});
    
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
      });
  }, [handleReportData]);

  /**
   * 根据答卷ID获取分析报告
   * 策略：先获取答卷信息，从中提取测评ID和受试者ID，再获取报告
   */
  const initAnalysisByAnswersheetId = useCallback(async (answersheetId) => {
    setAnswersheetid(answersheetId);
    
    try {
      Taro.showLoading({ title: '加载中...' });
      
      // 通过新接口链路：answersheet -> assessment -> report
      logger.RUN('[Analysis] 通过答卷ID获取报告:', { answersheetId });
      const reportResult = await getAssessmentReportByAnswersheetId(answersheetId);
      logger.RUN('[Analysis] 通过答卷ID获取报告成功');
      
      handleReportData(reportResult);
      Taro.hideLoading();
      setIsReady(true);
      
    } catch (err) {
      logger.ERROR('[Analysis] 加载失败:', err);
      Taro.hideLoading();
      Taro.showToast({
        title: err?.message || '加载分析报告失败',
        icon: 'none'
      });
      setIsReady(true);
    }
  }, [handleReportData]);

  /**
   * 检查是否有分析内容
   */
  const haveAnalysis = useCallback(() => {
    return total !== null || factors.length > 0;
  }, [total, factors]);

  useEffect(() => {
    const params = Taro.getCurrentInstance().router.params;
    logger.RUN("did effect <RUN> | params: ", { answersheetid: params.a, assessmentid: params.aid, reportid: params.rid });

    // 优先使用 assessment_id，如果没有则从答卷 ID 推导
    if (params.aid || params.rid) {
      // 直接有 assessment_id 和 testee_id
      const aid = params.aid || params.rid;
      initAnalysisByAssessmentId(aid, params.t);
    } else {
      // 从答卷 ID 获取分析（需要获取答卷详情来获取 testee_id）
      initAnalysisByAnswersheetId(params.a);
    }
    
  }, [initAnalysisByAssessmentId, initAnalysisByAnswersheetId]);

  useEffect(() => {
    if (tScores && Object.keys(tScores).length > 0) {
      setIsShowTScoreAnalysisCard(true);
    }else {
      setIsShowTScoreAnalysisCard(false);
    }
  }, [tScores]);

  useEffect(() => {
    if (( total || factors.length > 0) && Object.keys(tScores).length == 0 ) {
      setIsShowTotalAndFactorAnalysisCard(true);
    }else {
      setIsShowTotalAndFactorAnalysisCard(false);
    }
  }, [tScores, total, factors]);

  // 因子项组件
  const FactorItem = ({ title, content, score, maxScore, riskLevel, isLast }) => {
    const getRiskConfig = (riskLevel) => {
      const riskMap = {
        'high': {
          className: 'risk-high',
          label: '高风险',
          icon: 'alert-circle',
          textColor: '#FF4D4F',
          scoreBg: 'rgba(255, 77, 79, 0.1)',
          progressColor: '#FF4D4F'
        },
        'medium': {
          className: 'risk-medium',
          label: '中风险',
          icon: 'alert-circle',
          textColor: '#FA8C16',
          scoreBg: 'rgba(250, 140, 22, 0.1)',
          progressColor: '#FA8C16'
        },
        'low': {
          className: 'risk-low',
          label: '低风险',
          icon: 'check-circle',
          textColor: '#52C41A',
          scoreBg: 'rgba(82, 196, 26, 0.1)',
          progressColor: '#52C41A'
        },
        'normal': {
          className: 'risk-normal',
          label: '正常',
          icon: 'check-circle',
          textColor: '#1890FF',
          scoreBg: 'rgba(24, 144, 255, 0.1)',
          progressColor: '#1890FF'
        },
        'none': {
          className: 'risk-none',
          label: '',
          icon: '',
          textColor: '#666666',
          scoreBg: 'rgba(0, 0, 0, 0.05)',
          progressColor: '#666666'
        }
      };
      return riskMap[riskLevel] || riskMap['none'];
    };
    
    const riskConfig = getRiskConfig(riskLevel);
    
    return (
      <View className={`factor-item ${riskConfig.className} ${isLast ? 'last-item' : ''}`}>
        <View className="factor-item-header">
          <Text className="factor-item-title">{title}</Text>
          {riskConfig.label && (
            <View className={`factor-risk-badge ${riskConfig.className}`}>
              {riskConfig.icon && (
                <AtIcon value={riskConfig.icon} size="12" color={riskConfig.textColor} />
              )}
              <Text className="risk-label">{riskConfig.label}</Text>
            </View>
          )}
        </View>
        
        <View className="factor-item-body">
          <View className="factor-score-section">
            <View className="score-info">
              <Text className="score-label">得分</Text>
              <Text className={`score-value ${riskConfig.className}`}>
                {score !== undefined && score !== null 
                  ? (maxScore !== undefined && maxScore !== null 
                      ? `${score}/${maxScore}` 
                      : score)
                  : '--'}
              </Text>
            </View>
            {maxScore !== undefined && maxScore !== null && score !== undefined && score !== null && maxScore > 0 ? (
              <View className="score-progress-container">
                <View 
                  className={`score-progress-bar ${riskConfig.className}`}
                  style={{ 
                    width: `${Math.min((score / maxScore) * 100, 100)}%`
                  }}
                />
              </View>
            ) : null}
          </View>
          {content && (
            <Text className="factor-content-text">{content}</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <>
      {exportAnalysisFlag && (
        <ExportImageDialog
          total={total}
          factors={factors}
          flag={exportAnalysisFlag}
          onClose={() => {
            setExportAnalysisFlag(false);
          }}
        />
      )}

      <PrivacyAuthorization />

      {!isReady && (
        <AtActivityIndicator mode="center" content='加载中，请稍候...'></AtActivityIndicator>
      )}
      
      {isReady && isShowTScoreAnalysisCard && (
        <TScoreAnalysisShowCard tScores={tScores} />
      )}

      {isReady && isShowTotalAndFactorAnalysisCard && (
        <PageContainer>
          <View className="analysis-page-wrapper">
            {/* 页面标题区域 */}
            <View className="analysis-header">
              <View className="analysis-header-title">测评解读报告</View>
              {reportInfo.scale_name && (
                <View className="analysis-header-subtitle">
                  {reportInfo.scale_name}
                  {reportInfo.scale_code && ` (${reportInfo.scale_code})`}
                </View>
              )}
            </View>

            {/* 内容区域 */}
            <View className="analysis-content">
            {total ? (
              <TotalAnalysisShowCard
                content={total.content}
                score={total.score}
              ></TotalAnalysisShowCard>
            ) : null}
            
            {/* 因子区域 - 所有因子放在一个卡片中 */}
            {factors.length > 0 && (
              <View className="factors-container">
                <View className="factors-title">因子分析</View>
                <View className="factors-list">
                  {factors.map((v, index) => (
                    <FactorItem
                      key={v.factor_code}
                      title={v.title}
                      content={v.content}
                      score={v.score}
                      maxScore={v.max_score}
                      riskLevel={v.risk_level}
                      isLast={index === factors.length - 1}
                    />
                  ))}
                </View>
              </View>
            )}
            
            {/* 建议展示 */}
            {reportInfo.suggestions && reportInfo.suggestions.length > 0 && (
              <View className="suggestions-card">
                <View className="suggestions-title">建议</View>
                <View className="suggestions-list">
                  {reportInfo.suggestions.map((suggestion, index) => (
                    <View key={index} className="suggestion-item">
                      <View className="suggestion-number">{index + 1}</View>
                      <Text className="suggestion-text">{suggestion}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            
            {!haveAnalysis() ? (
              <View className="analysis-empty">
                <View className="empty-icon">📋</View>
                <View className="empty-text">暂无解读内容</View>
              </View>
            ) : null}
            </View>

            {/* 底部操作栏 */}
            <View className="analysis-footer-actions">
              <AtButton
                type="secondary"
                size="normal"
                className="footer-btn"
                onClick={() => {
                  Taro.redirectTo({
                    url: `/pages/answersheet/detail/index?a=${answersheetid}`
                  });
                }}
              >
                查看原始答卷
              </AtButton>
            </View>
          </View>
        </PageContainer>
      )}
    </>
  );
};

export default Analysis;
