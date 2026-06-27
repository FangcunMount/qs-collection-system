import React, { useEffect, useState, useCallback } from "react";
import { View, Text, Button } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { AtActivityIndicator } from "taro-ui";

import { getPersonalityAssessmentReport } from "@/services/api/personalityAssessments";
import { getAssessmentByAnswersheetId } from "@/services/api/assessments";
import { getLogger } from "@/shared/lib/logger";
import { getAssessmentEntryContext } from "@/shared/stores/assessmentEntry";
import { findTesteeById, getSelectedTesteeId } from "@/shared/stores/testees";
import { PrivacyAuthorization } from "@/shared/ui/PrivacyAuthorization";
import PlanSubscribeConfirm from "@/shared/ui/PlanSubscribeConfirm";
import { routes } from "@/shared/config/routes";
import { formatSimpleDate } from "@/shared/lib/dateFormatters";
import PersonalityReportHero from "../components/report/PersonalityReportHero";
import "./PersonalityReportPage.less";

const PAGE_NAME = "personality-report";
const logger = getLogger(PAGE_NAME);

const resolveTesteeName = (reportData) => {
  let testeeName = reportData.testee_name || "";
  let testeeId = reportData.testee_id || "";
  if (!testeeName) {
    const selectedTesteeId = getSelectedTesteeId();
    if (selectedTesteeId) {
      const testee = findTesteeById(selectedTesteeId);
      if (testee) {
        testeeName = testee.legalName || testee.name || "";
        testeeId = testee.id || "";
      }
    }
  }
  return { testeeName, testeeId };
};

const DimensionCard = ({ title, description, score, maxScore, suggestion }) => {
  const hasScore = score !== undefined && score !== null;
  const hasMax = maxScore !== undefined && maxScore !== null && maxScore > 0;
  const percent = hasScore && hasMax ? Math.min(Math.round((score / maxScore) * 100), 100) : 0;

  return (
    <View className="pr-dimension-card">
      <View className="pr-dimension-card__header">
        <Text className="pr-dimension-card__title">{title}</Text>
        {hasScore && (
          <Text className="pr-dimension-card__score">
            {score}
            {hasMax ? <Text className="pr-dimension-card__score-max"> / {maxScore}</Text> : null}
          </Text>
        )}
      </View>

      {hasScore && hasMax && (
        <View className="pr-dimension-card__track">
          <View className="pr-dimension-card__bar" style={{ width: `${percent}%` }} />
        </View>
      )}

      {description ? <View className="pr-dimension-card__desc">{description}</View> : null}

      {suggestion ? (
        <View className="pr-dimension-card__suggestion">
          <Text className="pr-dimension-card__suggestion-label">建议</Text>
          <View className="pr-dimension-card__suggestion-text">{suggestion}</View>
        </View>
      ) : null}
    </View>
  );
};

const PersonalityReport = () => {
  const routeParams = Taro.getCurrentInstance().router.params || {};
  const planTaskId = routeParams.task_id || "";

  const [isReady, setIsReady] = useState(false);
  const [answersheetId, setAnswersheetId] = useState(routeParams.a || "");
  const [modelExtra, setModelExtra] = useState(null);
  const [conclusion, setConclusion] = useState("");
  const [dimensions, setDimensions] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [reportInfo, setReportInfo] = useState({
    model_title: "",
    model_code: "",
    created_at: "",
    testee_name: "",
    testee_id: "",
  });
  const [entryContext] = useState(() => getAssessmentEntryContext());

  const handleReportData = useCallback((result) => {
    const reportData = result?.data || result || {};
    logger.RUN("[PersonalityReport] 原始报告数据:", reportData);

    const { testeeName, testeeId } = resolveTesteeName(reportData);

    setReportInfo({
      model_title: reportData.model_name || reportData.model?.title || reportData.scale_name || "",
      model_code: reportData.model_code || reportData.model?.code || reportData.scale_code || "",
      created_at: reportData.created_at || "",
      testee_name: testeeName,
      testee_id: testeeId,
    });

    setModelExtra(reportData.model_extra || reportData.modelExtra || null);
    setConclusion(reportData.conclusion || "");

    const mappedDimensions = (reportData.dimensions || []).map((dimension) => ({
      factor_code: dimension.factor_code,
      title: dimension.factor_name,
      description: dimension.description,
      score: dimension.raw_score,
      max_score: dimension.max_score,
      risk_level: dimension.risk_level,
      suggestion: dimension.suggestion || "",
    }));
    setDimensions(mappedDimensions);

    const mappedSuggestions = Array.isArray(reportData.suggestions)
      ? reportData.suggestions
          .map((s) => ({
            category: s.category || "",
            content: typeof s.content === "string" ? s.content : String(s.content || ""),
          }))
          .filter((s) => s.content)
      : [];
    setSuggestions(mappedSuggestions);
  }, []);

  const loadByAssessmentId = useCallback(async (assessmentId, testeeId) => {
    if (!assessmentId || !testeeId) {
      Taro.showToast({ title: "参数不完整", icon: "none" });
      setIsReady(true);
      return;
    }
    try {
      Taro.showLoading({ title: "加载中..." });
      const result = await getPersonalityAssessmentReport(assessmentId, testeeId);
      handleReportData(result);
    } catch (error) {
      logger.ERROR("[PersonalityReport] 获取报告失败:", error);
      Taro.showToast({ title: "加载人格报告失败", icon: "none" });
    } finally {
      try { Taro.hideLoading(); } catch (e) { /* noop */ }
      setIsReady(true);
    }
  }, [handleReportData]);

  const loadByAnswersheetId = useCallback(async (sheetId) => {
    try {
      Taro.showLoading({ title: "加载中..." });
      const detailResult = await getAssessmentByAnswersheetId(sheetId);
      const detail = detailResult?.data || detailResult || {};
      const assessmentId = detail.id || "";
      const testeeId = detail.testee_id || "";
      if (!assessmentId || !testeeId) {
        throw new Error("缺少 assessment_id 或 testee_id");
      }
      const result = await getPersonalityAssessmentReport(assessmentId, testeeId);
      handleReportData(result);
    } catch (error) {
      logger.ERROR("[PersonalityReport] 通过答卷ID加载失败:", error);
      Taro.showToast({ title: error?.message || "加载人格报告失败", icon: "none" });
    } finally {
      try { Taro.hideLoading(); } catch (e) { /* noop */ }
      setIsReady(true);
    }
  }, [handleReportData]);

  useEffect(() => {
    const params = Taro.getCurrentInstance().router.params || {};
    logger.RUN("[PersonalityReport] params:", params);
    if (params.aid || params.rid) {
      loadByAssessmentId(params.aid || params.rid, params.t);
    } else {
      setAnswersheetId(params.a || "");
      loadByAnswersheetId(params.a);
    }
  }, [loadByAssessmentId, loadByAnswersheetId]);

  if (!isReady) {
    return (
      <>
        <PrivacyAuthorization />
        <AtActivityIndicator mode="center" content="加载中，请稍候..." />
      </>
    );
  }

  return (
    <>
      <PrivacyAuthorization />

      <View className="personality-report-page">
        <PersonalityReportHero
          modelExtra={modelExtra || {}}
          conclusion={conclusion}
          modelTitle={reportInfo.model_title}
        />

        {(reportInfo.testee_name || reportInfo.created_at) && (
          <View className="pr-meta">
            {reportInfo.testee_name ? (
              <Text className="pr-meta__name">{reportInfo.testee_name}</Text>
            ) : null}
            {reportInfo.created_at ? (
              <Text className="pr-meta__time">生成时间 · {formatSimpleDate(reportInfo.created_at)}</Text>
            ) : null}
          </View>
        )}

        <PlanSubscribeConfirm
          taskId={planTaskId}
          planName={entryContext?.plan_name}
          entryTitle={entryContext?.entry_title || reportInfo.model_title}
          clinicianName={entryContext?.clinician_name}
          entryContext={entryContext}
          variant="floating"
        />

        {dimensions.length > 0 && (
          <View className="pr-section">
            <View className="pr-section__header">
              <Text className="pr-section__title">维度解读</Text>
              <Text className="pr-section__subtitle">基于你的作答还原的人格维度倾向</Text>
            </View>
            <View className="pr-dimension-list">
              {dimensions.map((dimension, index) => (
                <DimensionCard
                  key={dimension.factor_code || index}
                  title={dimension.title}
                  description={dimension.description}
                  score={dimension.score}
                  maxScore={dimension.max_score}
                  suggestion={dimension.suggestion}
                />
              ))}
            </View>
          </View>
        )}

        {suggestions.length > 0 && (
          <View className="pr-section">
            <View className="pr-section__header">
              <Text className="pr-section__title">成长建议</Text>
            </View>
            <View className="pr-advice-list">
              {suggestions.map((suggestion, index) => (
                <View className="pr-advice-card" key={`${suggestion.category}-${index}`}>
                  {suggestion.category ? (
                    <Text className="pr-advice-card__category">{suggestion.category}</Text>
                  ) : null}
                  <View className="pr-advice-card__content">{suggestion.content}</View>
                </View>
              ))}
            </View>
          </View>
        )}

        {dimensions.length === 0 && suggestions.length === 0 && (
          <View className="pr-empty">
            <Text className="pr-empty__text">暂无人格维度解读数据</Text>
          </View>
        )}

        <View className="pr-actions">
          <Button
            className="pr-actions__primary"
            onClick={() => {
              Taro.redirectTo({
                url: routes.assessmentResponse({
                  a: answersheetId,
                  task_id: planTaskId || undefined,
                }),
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

export default PersonalityReport;
