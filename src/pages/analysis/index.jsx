import React, { useEffect, useState, useCallback } from "react";
import { View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { AtButton, AtActivityIndicator } from "taro-ui";

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

  const [isReady, setIsReady] = useState(false);
  const [isShowTotalAndFactorAnalysisCard, setIsShowTotalAndFactorAnalysisCard] = useState(false);
  const [isShowTScoreAnalysisCard, setIsShowTScoreAnalysisCard] = useState(false);

  /**
   * 处理报告数据
   * 映射 API 字段到组件期望的字段
   */
  const handleReportData = useCallback((result) => {
    logger.RUN('[Analysis] 原始报告数据:', result);
    
    // 映射总分数据
    if (result.conclusion) {
      setTotal({
        content: result.conclusion,
        score: result.total_score
      });
    } else {
      setTotal(null);
    }
    
    // 映射因子维度数据
    const mappedFactors = (result.dimensions || []).map(dimension => ({
      factor_code: dimension.factor_code,
      title: dimension.factor_name,
      content: dimension.description,
      score: dimension.raw_score,
      max_score: dimension.max_score || 100, // 如果没有 max_score，默认 100
      risk_level: dimension.risk_level
    }));
    setFactors(mappedFactors);
    
    // T分数据（如果存在）
    setTScores(result.t_score_interpretations || {});
    
    logger.RUN('[Analysis] 映射后数据:', { total: { content: result.conclusion, score: result.total_score }, factors: mappedFactors });
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
            </View>

            {/* 内容区域 */}
            <View className="analysis-content">
            {total ? (
              <TotalAnalysisShowCard
                content={total.content}
                score={total.score}
              ></TotalAnalysisShowCard>
            ) : null}
            {factors.map(v => {
              return (
                <FactorAnalysisShowCard
                  key={v.factor_code}
                  title={v.title}
                  content={v.content}
                  score={v.score}
                  total={v.max_score}
                  riskLevel={v.risk_level}
                ></FactorAnalysisShowCard>
              );
            })}
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
