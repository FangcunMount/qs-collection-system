import React, { useCallback, useEffect, useRef, useState } from "react";
import Taro, { useDidHide, useDidShow } from "@tarojs/taro";
import { getSessionRevision, onSessionCleared } from "@/shared/stores/sessionPrivacy";
import { View } from "@tarojs/components";

import { routes } from "@/shared/config/routes";
import { isAbilityAssessmentKind, isPersonalityAssessmentKind } from "@/shared/lib/assessmentKind";
import { getLogger } from "@/shared/lib/logger";
import { getAssessmentEntryContext } from "@/shared/stores/assessmentEntry";
import { findTesteeById } from "@/shared/stores/testees";
import { getAssessmentTrendSummary } from "@/services/api/assessments";
import ReportPageShell from "../components/report/ReportPageShell";
import PlanSubscribeConfirm from "@/shared/ui/PlanSubscribeConfirm";
import {
  loadMedicalReportByAnswerSheet,
  loadMedicalReportByAssessmentId,
} from "../services/loadMedicalReport";
import {
  loadBehaviorReportByAnswerSheet,
  loadBehaviorReportByAssessmentId,
} from "../services/loadBehaviorReport";
import {
  buildMedicalReportViewModel,
  isPersonalityReportPayload,
} from "../viewModels/medicalReport";
import { buildBehaviorReportViewModel } from "../viewModels/behaviorReport";
import type { BehaviorReportViewModel, MedicalReportViewModel } from "../types";
import BehaviorReportContent from "../components/report/BehaviorReportContent";
import MedicalReportContent from "../components/report/MedicalReportContent";
import AIExplanationEntryCard from "../components/ai-explanation/AIExplanationEntryCard";
import MedicalReportOverview from "../components/report/MedicalReportOverview";
import MedicalReportTrendSummary from "../components/report/MedicalReportTrendSummary";
import ReportCompletionAction from "../components/report/ReportCompletionAction";
import "./AssessmentReportPage.less";

const logger = getLogger("analysis");

type RouteParams = Record<string, string | undefined>;
type TrendSummary = Record<string, unknown>;

const messageOf = (error: unknown): string => error instanceof Error && error.message
  ? error.message
  : "加载分析报告失败";

const AssessmentReportPage = () => {
  const params = (Taro.getCurrentInstance().router?.params || {}) as RouteParams;
  const planTaskId = params.task_id || "";
  const assessmentKind = params.kind || "";
  const isAbilityReport = isAbilityAssessmentKind(assessmentKind);
  const reportTone = isAbilityReport ? "ability" : "medical";
  const [answerSheetId, setAnswerSheetId] = useState<string | number>(params.a || "");
  const [assessmentContext, setAssessmentContext] = useState({ assessmentId: "", testeeId: "" });
  const [report, setReport] = useState<MedicalReportViewModel | BehaviorReportViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [trendSummary, setTrendSummary] = useState<TrendSummary | null>(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendError, setTrendError] = useState("");
  const [entryContext] = useState(() => getAssessmentEntryContext());

  const requestVersion = useRef(0);
  const reloadOnShow = useRef(false);
  const trendVersion = useRef(0);
  useEffect(() => onSessionCleared(() => {
    reloadOnShow.current = false;
    requestVersion.current += 1;
    trendVersion.current += 1;
    setReport(null);
    setAssessmentContext({ assessmentId: "", testeeId: "" });
    setAnswerSheetId("");
    setTrendSummary(null);
    setTrendLoading(false);
    setTrendError("");
    setLoading(false);
    setError("登录状态已变化，请重新打开报告。");
  }), []);

  const redirectPersonality = useCallback((raw?: unknown) => {
    if (!isPersonalityAssessmentKind(assessmentKind) && !isPersonalityReportPayload(raw)) return false;
    Taro.redirectTo({
      url: routes.personalityReport({
        a: params.a,
        aid: params.aid || params.rid,
        t: params.t,
        task_id: params.task_id,
      }),
    });
    return true;
  }, [assessmentKind, params.a, params.aid, params.rid, params.t, params.task_id]);

  const loadTrend = useCallback(async (assessmentId: string, testeeId: string) => {
    const version = ++trendVersion.current;
    const reportVersion = requestVersion.current;
    const session = getSessionRevision();
    const isCurrent = () => version === trendVersion.current && reportVersion === requestVersion.current && session === getSessionRevision();
    if (isAbilityReport || !assessmentId || !testeeId) {
      setTrendSummary(null);
      return;
    }
    setTrendLoading(true);
    setTrendError("");
    try {
      const result = await getAssessmentTrendSummary(assessmentId, testeeId) as unknown;
      if (!isCurrent()) return;
      const wrapper = result && typeof result === "object" ? result as { data?: unknown } : {};
      const payload = "data" in wrapper ? wrapper.data : result;
      if (!payload || typeof payload !== "object") throw new Error("暂未获取到趋势数据，请重试");
      setTrendSummary(payload as TrendSummary);
    } catch (trendError) {
      if (!isCurrent()) return;
      logger.ERROR("[Analysis] 获取趋势摘要失败:", trendError);
      setTrendSummary(null);
      setTrendError("暂未获取到趋势数据，请重试");
    } finally {
      if (isCurrent()) setTrendLoading(false);
    }
  }, [isAbilityReport]);

  const applyReport = useCallback((raw: unknown, testeeId: string) => {
    logger.RUN("[Analysis] 原始报告数据:", raw);
    if (redirectPersonality(raw)) return false;
    const viewModel = isAbilityReport
      ? buildBehaviorReportViewModel(raw, findTesteeById(testeeId) || { id: testeeId })
      : buildMedicalReportViewModel(raw, findTesteeById(testeeId) || { id: testeeId });
    setReport(viewModel);
    return true;
  }, [isAbilityReport, redirectPersonality]);

  const loadFromRoute = useCallback(async () => {
    const version = ++requestVersion.current;
    trendVersion.current += 1;
    const session = getSessionRevision();
    const isCurrent = () => version === requestVersion.current && session === getSessionRevision();
    setAssessmentContext({ assessmentId: "", testeeId: "" });
    setTrendSummary(null);
    setTrendError("");
    setTrendLoading(false);
    if (redirectPersonality()) return;
    setLoading(true);
    setError("");
    setReport(null);
    setAnswerSheetId(params.a || "");
    try {
      if (params.aid || params.rid) {
        const assessmentId = params.aid || params.rid || "";
        if (!assessmentId || !params.t) throw new Error("参数不完整");
        const result = isAbilityReport
          ? await loadBehaviorReportByAssessmentId({ assessmentId, testeeId: params.t })
          : await loadMedicalReportByAssessmentId({ assessmentId, testeeId: params.t });
        if (!isCurrent()) return;
        const context = { assessmentId: String(result.assessmentId), testeeId: String(result.testeeId) };
        setAssessmentContext(context);
        if (applyReport(result.report, context.testeeId)) void loadTrend(context.assessmentId, context.testeeId);
      } else {
        const result = isAbilityReport
          ? await loadBehaviorReportByAnswerSheet({
            answersheetId: params.a,
            testeeIdFromUrl: params.t,
            logger,
          })
          : await loadMedicalReportByAnswerSheet({
            answersheetId: params.a,
            testeeIdFromUrl: params.t,
            logger,
          });
        if (!isCurrent()) return;
        const context = { assessmentId: String(result.assessmentId), testeeId: String(result.testeeId) };
        setAssessmentContext(context);
        if (applyReport(result.report, context.testeeId)) void loadTrend(context.assessmentId, context.testeeId);
      }
    } catch (loadError) {
      if (!isCurrent()) return;
      logger.ERROR("[Analysis] 获取测评报告失败:", loadError);
      setError(messageOf(loadError));
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [applyReport, isAbilityReport, loadTrend, params.a, params.aid, params.rid, params.t, redirectPersonality]);

  useDidHide(() => {
    requestVersion.current += 1;
    trendVersion.current += 1;
    reloadOnShow.current = true;
  });
  useDidShow(() => {
    if (!reloadOnShow.current) return;
    reloadOnShow.current = false;
    void loadFromRoute();
  });

  useEffect(() => {
    logger.RUN("did effect <RUN> | params: ", params);
    void loadFromRoute();
    return () => { requestVersion.current += 1; trendVersion.current += 1; };
  }, [loadFromRoute]);

  useEffect(() => {
    if (!isAbilityReport) return;
    void Taro.setNavigationBarTitle({ title: "行为能力报告" });
  }, [isAbilityReport]);

  const completionAction = report ? (
    <ReportCompletionAction answerSheetId={answerSheetId} taskId={planTaskId} tone={reportTone} />
  ) : undefined;

  return (
    <ReportPageShell
      tone={reportTone}
      loading={loading}
      error={error}
      onRetry={() => void loadFromRoute()}
      fixedAction={completionAction}
      className={isAbilityReport ? "behavior-report-shell" : "medical-report-shell"}
    >
      {report ? (
        <View className="analysis-report-page report-page-content">
          {report.tone === "ability" ? (
            <>
              <BehaviorReportContent report={report} />
              <PlanSubscribeConfirm
                taskId={planTaskId}
                planName={entryContext?.plan_name}
                entryTitle={entryContext?.entry_title || report.modelName}
                clinicianName={entryContext?.clinician_name}
                entryContext={entryContext}
                variant="floating"
              />
            </>
          ) : (
            <>
              <MedicalReportOverview report={report} />
              <AIExplanationEntryCard {...assessmentContext} />
              <PlanSubscribeConfirm
                taskId={planTaskId}
                planName={entryContext?.plan_name}
                entryTitle={entryContext?.entry_title || report.scaleName}
                clinicianName={entryContext?.clinician_name}
                entryContext={entryContext}
                variant="floating"
              />
              <MedicalReportTrendSummary
                summary={trendSummary}
                loading={trendLoading}
                assessmentId={assessmentContext.assessmentId}
                testeeId={assessmentContext.testeeId}
                error={trendError}
                onRetry={() => void loadTrend(assessmentContext.assessmentId, assessmentContext.testeeId)}
              />
              <MedicalReportContent factors={report.factors} />
            </>
          )}
        </View>
      ) : null}
    </ReportPageShell>
  );
};

export default AssessmentReportPage;
