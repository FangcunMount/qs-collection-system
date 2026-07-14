import React, { useCallback, useEffect, useState } from "react";
import Taro from "@tarojs/taro";

import { getLogger } from "@/shared/lib/logger";
import { getAssessmentEntryContext } from "@/shared/stores/assessmentEntry";
import { findTesteeById, getSelectedTesteeId } from "@/shared/stores/testees";
import ReportPageShell from "../components/report/ReportPageShell";
import PlanSubscribeConfirm from "@/shared/ui/PlanSubscribeConfirm";
import {
  loadPersonalityReportByAnswerSheet,
  loadPersonalityReportByAssessmentId,
} from "../services/loadPersonalityReport";
import { buildPersonalityReportViewModel } from "../viewModels/personalityReport";
import type { PersonalityReportViewModel } from "../types";
import PersonalityReportContent from "../components/report/PersonalityReportContent";
import ReportCompletionAction from "../components/report/ReportCompletionAction";
import "./PersonalityReportPage.less";

const logger = getLogger("personality-report");
type RouteParams = Record<string, string | undefined>;

const currentFallbackTestee = () => {
  const selectedId = getSelectedTesteeId();
  return selectedId ? findTesteeById(selectedId) : null;
};

const PersonalityReportPage = () => {
  const params = (Taro.getCurrentInstance().router?.params || {}) as RouteParams;
  const planTaskId = params.task_id || "";
  const [answerSheetId, setAnswerSheetId] = useState(params.a || "");
  const [report, setReport] = useState<PersonalityReportViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [entryContext] = useState(() => getAssessmentEntryContext());

  const loadFromRoute = useCallback(async () => {
    setLoading(true);
    setError("");
    setReport(null);
    try {
      let raw: unknown;
      if (params.aid || params.rid) {
        const assessmentId = params.aid || params.rid || "";
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
      }
      const viewModel = buildPersonalityReportViewModel(raw, currentFallbackTestee());
      logger.RUN("[PersonalityReport] ViewModel:", viewModel);
      setReport(viewModel);
    } catch (loadError) {
      logger.ERROR("[PersonalityReport] 获取报告失败:", loadError);
      setError(loadError instanceof Error && loadError.message ? loadError.message : "加载人格报告失败");
    } finally {
      setLoading(false);
    }
  }, [params.a, params.aid, params.rid, params.t]);

  useEffect(() => {
    logger.RUN("[PersonalityReport] params:", params);
    void loadFromRoute();
  }, [loadFromRoute]);

  const completionAction = report ? (
    <ReportCompletionAction answerSheetId={answerSheetId} taskId={planTaskId} tone="personality" />
  ) : undefined;

  return (
    <ReportPageShell
      tone="personality"
      loading={loading}
      error={error}
      onRetry={() => void loadFromRoute()}
      fixedAction={completionAction}
      className="personality-report-shell"
    >
      {report ? (
        <>
          <PersonalityReportContent report={report} />
          <PlanSubscribeConfirm
            taskId={planTaskId}
            planName={entryContext?.plan_name}
            entryTitle={entryContext?.entry_title || report.modelTitle}
            clinicianName={entryContext?.clinician_name}
            entryContext={entryContext}
            variant="floating"
          />
        </>
      ) : null}
    </ReportPageShell>
  );
};

export default PersonalityReportPage;
