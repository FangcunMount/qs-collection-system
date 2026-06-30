import React, { useEffect, useState, useCallback } from "react";
import { View, Text, Button } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { AtActivityIndicator } from "taro-ui";

import { getPersonalityReport } from "@/services/api/personality";
import { getAssessmentByAnswersheetId } from "@/services/api/assessments";
import { normalizePersonalityReport } from "@/modules/assessment/services/personalityReportMapper";
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

const resolveTesteeName = (reportVM) => {
  let testeeName = reportVM.testeeName || "";
  let testeeId = reportVM.testeeId || "";
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
  const [reportVM, setReportVM] = useState(null);
  const [entryContext] = useState(() => getAssessmentEntryContext());

  const applyReportVM = useCallback((raw) => {
    const vm = normalizePersonalityReport(raw);
    const { testeeName, testeeId } = resolveTesteeName(vm);
    logger.RUN("[PersonalityReport] ViewModel:", vm);
    setReportVM({
      ...vm,
      testeeName: testeeName || vm.testeeName,
      testeeId: testeeId || vm.testeeId,
    });
  }, []);

  const loadByAssessmentId = useCallback(async (assessmentId, testeeId) => {
    if (!assessmentId || !testeeId) {
      Taro.showToast({ title: "参数不完整", icon: "none" });
      setIsReady(true);
      return;
    }
    try {
      Taro.showLoading({ title: "加载中..." });
      const result = await getPersonalityReport({ assessmentId, testeeId });
      applyReportVM(result);
    } catch (error) {
      logger.ERROR("[PersonalityReport] 获取报告失败:", error);
      Taro.showToast({ title: "加载人格报告失败", icon: "none" });
    } finally {
      try { Taro.hideLoading(); } catch (e) { /* noop */ }
      setIsReady(true);
    }
  }, [applyReportVM]);

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
      const result = await getPersonalityReport({ assessmentId, testeeId });
      applyReportVM(result);
    } catch (error) {
      logger.ERROR("[PersonalityReport] 通过答卷ID加载失败:", error);
      Taro.showToast({ title: error?.message || "加载人格报告失败", icon: "none" });
    } finally {
      try { Taro.hideLoading(); } catch (e) { /* noop */ }
      setIsReady(true);
    }
  }, [applyReportVM]);

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

  const dimensions = reportVM?.dimensions || [];
  const suggestions = reportVM?.suggestions || [];
  const sections = reportVM?.sections || [];

  return (
    <>
      <PrivacyAuthorization />

      <View className="personality-report-page">
        <PersonalityReportHero
          modelExtra={reportVM?.hero?.modelExtra || {}}
          conclusion={reportVM?.hero?.conclusion || ""}
          modelTitle={reportVM?.modelTitle || ""}
        />

        {(reportVM?.testeeName || reportVM?.createdAt) && (
          <View className="pr-meta">
            {reportVM?.testeeName ? (
              <Text className="pr-meta__name">{reportVM.testeeName}</Text>
            ) : null}
            {reportVM?.createdAt ? (
              <Text className="pr-meta__time">生成时间 · {formatSimpleDate(reportVM.createdAt)}</Text>
            ) : null}
          </View>
        )}

        <PlanSubscribeConfirm
          taskId={planTaskId}
          planName={entryContext?.plan_name}
          entryTitle={entryContext?.entry_title || reportVM?.modelTitle}
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

        {sections.length > 0 && dimensions.length === 0 && (
          <View className="pr-section">
            <View className="pr-section__header">
              <Text className="pr-section__title">报告解读</Text>
            </View>
            <View className="pr-advice-list">
              {sections.map((section, index) => (
                <View className="pr-advice-card" key={section.key || index}>
                  {section.title ? (
                    <Text className="pr-advice-card__category">{section.title}</Text>
                  ) : null}
                  <View className="pr-advice-card__content">{section.content}</View>
                </View>
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

        {!reportVM?.hasContent && (
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
