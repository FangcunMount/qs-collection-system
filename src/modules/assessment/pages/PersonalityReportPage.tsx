import React, { useCallback, useEffect, useRef, useState } from "react";
import Taro, { useDidHide, useDidShow } from "@tarojs/taro";
import { getSessionRevision, onSessionCleared } from "@/shared/stores/sessionPrivacy";

import { getLogger } from "@/shared/lib/logger";
import { getAssessmentEntryContext } from "@/shared/stores/assessmentEntry";
import { findTesteeById } from "@/shared/stores/testees";
import ReportPageShell from "../components/report/ReportPageShell";
import PlanSubscribeConfirm from "@/shared/ui/PlanSubscribeConfirm";
import {
  loadPersonalityReportByAnswerSheet,
  loadPersonalityReportByAssessmentId,
} from "../services/loadPersonalityReport";
import { buildPersonalityReportViewModel } from "../viewModels/personalityReport";
import type { PersonalityReportViewModel } from "../types";
import PersonalityReportContent from "../components/report/PersonalityReportContent";
import AIExplanationEntryCard from "../components/ai-explanation/AIExplanationEntryCard";
import ReportCompletionAction from "../components/report/ReportCompletionAction";
import "./PersonalityReportPage.less";

const logger = getLogger("personality-report");
type RouteParams = Record<string, string | undefined>;

const PersonalityReportPage = () => {
  const params = (Taro.getCurrentInstance().router?.params || {}) as RouteParams;
  const planTaskId = params.task_id || "";
  const [answerSheetId, setAnswerSheetId] = useState(params.a || "");
  const [assessmentContext, setAssessmentContext] = useState({ assessmentId: "", testeeId: "" });
  const [report, setReport] = useState<PersonalityReportViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [entryContext] = useState(() => getAssessmentEntryContext());

  const requestVersion = useRef(0);
  const reloadOnShow = useRef(false);
  useEffect(() => onSessionCleared(() => {
    reloadOnShow.current = false;
    requestVersion.current += 1;
    setReport(null);
    setAssessmentContext({ assessmentId: "", testeeId: "" });
    setAnswerSheetId("");
    setLoading(false);
    setError("登录状态已变化，请重新打开报告。");
  }), []);

  const loadFromRoute = useCallback(async () => {
    const version = ++requestVersion.current;
    const session = getSessionRevision();
    const isCurrent = () => version === requestVersion.current && session === getSessionRevision();
    setAnswerSheetId(params.a || "");
    setLoading(true);
    setError("");
    setReport(null);
    setAssessmentContext({ assessmentId: "", testeeId: "" });
    try {
      let raw: unknown;
      let assessmentId = params.aid || params.rid || "";
      let testeeId = params.t || "";
      if (params.aid || params.rid) {
        if (!assessmentId || !params.t) throw new Error("参数不完整");
        raw = await loadPersonalityReportByAssessmentId({ assessmentId, testeeId: params.t });
      } else {
        setAnswerSheetId(params.a || "");
        const result = await loadPersonalityReportByAnswerSheet({
          answersheetId: params.a,
          testeeIdFromUrl: params.t,
          logger,
        });
        raw = result.report;
        assessmentId = String(result.assessmentId);
        testeeId = String(result.testeeId);
      }
      if (!isCurrent()) return;
      const viewModel = buildPersonalityReportViewModel(raw, findTesteeById(testeeId) || { id: testeeId });
      logger.RUN("[PersonalityReport] ViewModel:", viewModel);
      setAssessmentContext({ assessmentId, testeeId });
      setReport(viewModel);
    } catch (loadError) {
      if (!isCurrent()) return;
      logger.ERROR("[PersonalityReport] 获取报告失败:", loadError);
      setError(loadError instanceof Error && loadError.message ? loadError.message : "加载人格报告失败");
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [params.a, params.aid, params.rid, params.t]);

  useDidHide(() => {
    requestVersion.current += 1;
    reloadOnShow.current = true;
  });
  useDidShow(() => {
    if (!reloadOnShow.current) return;
    reloadOnShow.current = false;
    void loadFromRoute();
  });

  useEffect(() => {
    logger.RUN("[PersonalityReport] params:", params);
    void loadFromRoute();
    return () => { requestVersion.current += 1; };
  }, [loadFromRoute]);

  return (
    <ReportPageShell
      tone="personality"
      loading={loading}
      error={error}
      onRetry={() => void loadFromRoute()}
      className="personality-report-shell"
    >
      {report ? (
        <>
          <PersonalityReportContent report={report} supplement={<AIExplanationEntryCard {...assessmentContext} tone="personality" />} />
          <PlanSubscribeConfirm
            taskId={planTaskId}
            planName={entryContext?.plan_name}
            entryTitle={entryContext?.entry_title || report.modelTitle}
            clinicianName={entryContext?.clinician_name}
            entryContext={entryContext}
            variant="inline"
          />
          <ReportCompletionAction
            answerSheetId={answerSheetId}
            taskId={planTaskId}
            tone="personality"
            variant="inline"
          />
        </>
      ) : null}
    </ReportPageShell>
  );
};

export default PersonalityReportPage;
