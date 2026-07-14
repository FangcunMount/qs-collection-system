import React, { useCallback, useEffect, useState } from "react";
import Taro from "@tarojs/taro";
import { View } from "@tarojs/components";

import PlanSubscribeConfirm from "@/shared/ui/PlanSubscribeConfirm";
import { routes } from "@/shared/config/routes";
import { isPersonalityAssessmentKind } from "@/shared/lib/assessmentKind";
import { getLogger } from "@/shared/lib/logger";
import { getAssessmentEntryContext } from "@/shared/stores/assessmentEntry";
import { findTesteeById, getSelectedTesteeId } from "@/shared/stores/testees";
import { getAssessmentTrendSummary } from "@/services/api/assessments";
import {
  loadMedicalReportByAnswerSheet,
  loadMedicalReportByAssessmentId,
} from "../services/loadMedicalReport";
import {
  buildMedicalReportViewModel,
  isPersonalityReportPayload,
} from "../viewModels/medicalReport";
import type { MedicalReportViewModel } from "../types";
import MedicalReportContent from "../components/report/MedicalReportContent";
import MedicalReportOverview from "../components/report/MedicalReportOverview";
import MedicalReportTrendSummary from "../components/report/MedicalReportTrendSummary";
import ReportCompletionAction from "../components/report/ReportCompletionAction";
import ReportPageShell from "../components/report/ReportPageShell";
import "./AssessmentReportPage.less";

const logger = getLogger("analysis");

type RouteParams = Record<string, string | undefined>;
type TrendSummary = Record<string, unknown>;

const currentFallbackTestee = () => {
  const selectedId = getSelectedTesteeId();
  return selectedId ? findTesteeById(selectedId) : null;
};

const messageOf = (error: unknown): string => error instanceof Error && error.message
  ? error.message
  : "加载分析报告失败";

const AssessmentReportPage = () => {
  const params = (Taro.getCurrentInstance().router?.params || {}) as RouteParams;
  const planTaskId = params.task_id || "";
  const assessmentKind = params.kind || "";
  const [answerSheetId, setAnswerSheetId] = useState<string | number>(-1);
  const [assessmentContext, setAssessmentContext] = useState({ assessmentId: "", testeeId: "" });
  const [report, setReport] = useState<MedicalReportViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [trendSummary, setTrendSummary] = useState<TrendSummary | null>(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const [entryContext] = useState(() => getAssessmentEntryContext());

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
    if (!assessmentId || !testeeId) {
      setTrendSummary(null);
      return;
    }
    setTrendLoading(true);
    try {
      const result = await getAssessmentTrendSummary(assessmentId, testeeId) as unknown;
      const wrapper = result && typeof result === "object" ? result as { data?: unknown } : {};
      const payload = wrapper.data ?? result;
      setTrendSummary(payload && typeof payload === "object" ? payload as TrendSummary : null);
    } catch (trendError) {
      logger.ERROR("[Analysis] 获取趋势摘要失败:", trendError);
      setTrendSummary(null);
    } finally {
      setTrendLoading(false);
    }
  }, []);

  const applyReport = useCallback((raw: unknown) => {
    logger.RUN("[Analysis] 原始报告数据:", raw);
    if (redirectPersonality(raw)) return false;
    const viewModel = buildMedicalReportViewModel(raw, currentFallbackTestee());
    setReport(viewModel);
    return true;
  }, [redirectPersonality]);

  const loadFromRoute = useCallback(async () => {
    if (redirectPersonality()) return;
    setLoading(true);
    setError("");
    setReport(null);
    try {
      if (params.aid || params.rid) {
        const assessmentId = params.aid || params.rid || "";
        if (!assessmentId || !params.t) throw new Error("参数不完整");
        const result = await loadMedicalReportByAssessmentId({ assessmentId, testeeId: params.t });
        const context = { assessmentId: String(result.assessmentId), testeeId: String(result.testeeId) };
        setAssessmentContext(context);
        if (applyReport(result.report)) void loadTrend(context.assessmentId, context.testeeId);
      } else {
        setAnswerSheetId(params.a || -1);
        const result = await loadMedicalReportByAnswerSheet({
          answersheetId: params.a,
          testeeIdFromUrl: params.t,
          logger,
        });
        const context = { assessmentId: String(result.assessmentId), testeeId: String(result.testeeId) };
        setAssessmentContext(context);
        if (applyReport(result.report)) await loadTrend(context.assessmentId, context.testeeId);
      }
    } catch (loadError) {
      logger.ERROR("[Analysis] 获取测评报告失败:", loadError);
      setError(messageOf(loadError));
    } finally {
      setLoading(false);
    }
  }, [applyReport, loadTrend, params.a, params.aid, params.rid, params.t, redirectPersonality]);

  useEffect(() => {
    logger.RUN("did effect <RUN> | params: ", params);
    void loadFromRoute();
  }, [loadFromRoute]);

  const completionAction = report ? (
    <ReportCompletionAction answerSheetId={answerSheetId} taskId={planTaskId} tone="medical" />
  ) : undefined;

  return (
    <ReportPageShell
      tone="medical"
      loading={loading}
      error={error}
      onRetry={() => void loadFromRoute()}
      fixedAction={completionAction}
      className="medical-report-shell"
    >
      {report ? (
        <View className="analysis-report-page report-page-content">
          <MedicalReportOverview report={report} />
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
            factors={report.factors}
            riskLevel={report.riskLevel}
          />
          <MedicalReportContent factors={report.factors} />
        </View>
      ) : null}
    </ReportPageShell>
  );
};

export default AssessmentReportPage;
