import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import lottie from "lottie-miniprogram";

import carLoadingData from "@/assets/lotties/car-loading-data.json";
import { buildReportWaitViewModel } from "@/modules/assessment/lib/reportWaitViewState";
import { resolveReportRedirectKind } from "@/modules/assessment/lib/assessmentSubmitNavigation";
import { resolveTesteeIdForAnswerSheet } from "@/modules/assessment/lib/resolveTesteeId";
import { createReportWaitStrategy } from "@/modules/assessment/services/reportWaitStrategy";
import {
  resolveAssessmentStatusPhase,
  resolveAssessmentWaitResume,
} from "@/modules/assessment/services/assessmentWaitResume";
import {
  clearSubmissionContext,
  getSubmissionContext,
  saveSubmissionContext,
} from "@/modules/assessment/services/submissionContextStore";
import { waitAssessmentReportLifecycle } from "@/modules/assessment/services/waitAssessmentReportLifecycle";
import type { ReportWaitPhase } from "@/modules/assessment/types";
import { routes } from "@/shared/config/routes";
import { isPersonalityAssessmentKind } from "@/shared/lib/assessmentKind";
import { getLogger } from "@/shared/lib/logger";
import PageShell from "@/shared/ui/PageShell";
import StatePanel from "@/shared/ui/StatePanel";
import ActionButton from "@/shared/ui/ActionButton";
import { PrivacyAuthorization } from "@/shared/ui/PrivacyAuthorization";
import SurfaceCard from "@/shared/ui/SurfaceCard";
import "./AssessmentReportPendingPage.less";

const PAGE_NAME = "analysis_wait";
const logger = getLogger(PAGE_NAME);
const MIN_WAIT_TIME = 2000;

interface WaitFlowParams {
  assessmentId: string;
  answerSheetId: string;
  testeeId: string;
  requestId: string;
  taskId: string;
  assessmentKind: string;
  assessmentWaitStartedAt: number;
  initialPhase: ReportWaitPhase;
  initialStage: string;
  initialMessage: string;
}

interface WaitStatusData {
  status?: string;
  stage?: string;
  message?: string;
  reason?: string;
}

interface WaitLifecycleResult {
  cancelled?: boolean;
  source?: string;
  statusData?: WaitStatusData;
  assessmentId?: string;
  answerSheetId?: string;
}

interface LottieAnimationInstance {
  destroy: () => void;
}

interface LottieCanvasNode {
  width: number;
  height: number;
  getContext: (type: "2d") => CanvasRenderingContext2D;
}

interface CanvasQueryResult {
  node?: LottieCanvasNode;
  width?: number;
  height?: number;
}

const toText = (value: unknown): string => (
  value === undefined || value === null ? "" : String(value)
);

const getErrorMessage = (error: unknown): string => (
  error instanceof Error ? error.message : "加载测评状态失败，请稍后重试"
);

const AssessmentReportPendingPage = () => {
  const [phase, setPhase] = useState<ReportWaitPhase>("processing");
  const [message, setMessage] = useState("正在生成测评记录，请稍候...");
  const [stage, setStage] = useState("");
  const [failureCanOpenReport, setFailureCanOpenReport] = useState(false);
  const [dots, setDots] = useState("");
  const isPollingRef = useRef(false);
  const runIdRef = useRef(0);
  const flowParamsRef = useRef<WaitFlowParams | null>(null);
  const lottieInstanceRef = useRef<LottieAnimationInstance | null>(null);
  const startTimeRef = useRef(Date.now());

  const viewModel = useMemo(
    () => buildReportWaitViewModel({ phase, message, stage }),
    [message, phase, stage],
  );

  const startWaitFlow = useCallback(async (flowParams: WaitFlowParams) => {
    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    flowParamsRef.current = flowParams;
    isPollingRef.current = true;
    startTimeRef.current = flowParams.assessmentWaitStartedAt;
    setPhase(flowParams.initialPhase);
    setStage(flowParams.initialStage);
    setMessage(flowParams.initialMessage);
    setFailureCanOpenReport(false);

    const isActive = () => isPollingRef.current && runIdRef.current === runId;

    const {
      assessmentId,
      answerSheetId,
      testeeId: testeeIdFromUrl,
      requestId,
      taskId,
      assessmentKind,
      assessmentWaitStartedAt,
    } = flowParams;

    try {
      let testeeId = testeeIdFromUrl;
      if (!testeeId) {
        testeeId = toText(await resolveTesteeIdForAnswerSheet({
          testeeIdFromUrl,
          answersheetId: answerSheetId,
          logger,
        }));
      }
      if (!testeeId) {
        throw new Error("未找到受试者信息，请稍后重试");
      }

      const strategy = createReportWaitStrategy(assessmentKind);
      const applyStatus = (statusData: WaitStatusData) => {
        if (!isActive()) return;
        if (statusData.stage) setStage(statusData.stage);
        setMessage(strategy.formatStageMessage(statusData.stage, statusData.message));
        if (statusData.stage === "assessment_delayed") {
          setPhase("delayed");
          saveSubmissionContext({
            requestId,
            testeeId,
            assessmentKind: strategy.kind,
            answersheetId: answerSheetId,
            assessmentWaitStartedAt,
            phase: "delayed",
          });
          return;
        }
        setPhase((current) => resolveAssessmentStatusPhase(current, statusData.stage));
      };

      logger.RUN("[AnalysisWait] 开始等待（assessment-readiness → WS/report-status）", {
        answersheetId: answerSheetId,
        assessmentId: assessmentId || null,
        requestId: requestId || null,
        testeeId,
        assessmentKind,
      });

      const result = await waitAssessmentReportLifecycle({
        strategy,
        assessmentKind,
        assessmentId,
        answerSheetId,
        requestId,
        testeeId,
        onStatus: applyStatus,
        onFallback: () => {
          if (!isActive()) return;
          setPhase("degraded");
          setMessage("实时连接暂不可用，正在通过安全轮询继续生成报告...");
        },
        onSubmissionReady: (submission: {
          requestId: string;
          answersheetId: string;
          assessmentId: string;
        }) => {
          if (flowParamsRef.current) {
            flowParamsRef.current = {
              ...flowParamsRef.current,
              answerSheetId: submission.answersheetId,
              assessmentId: submission.assessmentId,
            };
          }
          saveSubmissionContext({
            requestId: submission.requestId,
            testeeId,
            assessmentKind: strategy.kind,
            answersheetId: submission.answersheetId,
            assessmentId: submission.assessmentId,
            assessmentWaitStartedAt,
            phase: "assessment_ready",
          });
        },
        shouldContinue: isActive,
        logger,
        assessmentLookupOptions: {
          startedAt: assessmentWaitStartedAt,
          onAttempt: () => {
            if (isActive()) setMessage("正在关联测评记录，请稍候...");
          },
        },
      }) as WaitLifecycleResult;

      if (result.cancelled || !isActive()) return;

      const statusData = result.statusData || {};
      const resolvedAssessmentId = toText(result.assessmentId);
      const resolvedAnswerSheetId = toText(result.answerSheetId || answerSheetId);

      logger.RUN("[AnalysisWait] 等待结束", {
        source: result.source,
        assessmentId: resolvedAssessmentId,
        status: statusData.status,
        stage: statusData.stage,
      });

      if (statusData.status === "no_assessment_required") {
        isPollingRef.current = false;
        clearSubmissionContext();
        Taro.redirectTo({
          url: routes.assessmentResponse({
            a: resolvedAnswerSheetId,
            task_id: taskId || undefined,
          }),
        });
        return;
      }

      if (strategy.isFailed(statusData.status)) {
        const failureMessage = statusData.reason || statusData.message || "报告生成失败，请稍后重试";
        if (statusData.stage) setStage(statusData.stage);
        setPhase("failure");
        setMessage(failureMessage);
        const canOpenReport = result.source !== "assessment-readiness" && Boolean(resolvedAssessmentId);
        setFailureCanOpenReport(canOpenReport);
        if (result.source === "assessment-readiness") {
          saveSubmissionContext({
            requestId,
            testeeId,
            assessmentKind: strategy.kind,
            answersheetId: resolvedAnswerSheetId,
            assessmentId: "",
            assessmentWaitStartedAt,
            phase: "assessment_failed",
            statusMessage: failureMessage,
          });
        }
        isPollingRef.current = false;
        return;
      }

      saveSubmissionContext({
        requestId,
        testeeId,
        assessmentKind: strategy.kind,
        answersheetId: resolvedAnswerSheetId,
        assessmentId: resolvedAssessmentId,
        assessmentWaitStartedAt,
        phase: "report_processing",
      });
      if (flowParamsRef.current && resolvedAssessmentId) {
        flowParamsRef.current = {
          ...flowParamsRef.current,
          answerSheetId: resolvedAnswerSheetId,
          assessmentId: resolvedAssessmentId,
        };
      }

      if (strategy.isCompleted(statusData.status) && resolvedAssessmentId) {
        setPhase("success");
        setMessage("报告已生成，即将为你打开报告");
        isPollingRef.current = false;
        const elapsedTime = Date.now() - startTimeRef.current;
        const remainingTime = Math.max(0, MIN_WAIT_TIME - elapsedTime);

        setTimeout(() => {
          if (runIdRef.current !== runId) return;
          Taro.redirectTo({
            url: strategy.reportRoute({
              a: resolvedAnswerSheetId,
              aid: resolvedAssessmentId,
              t: testeeId,
              kind: resolveReportRedirectKind(strategy.kind),
              task_id: taskId || undefined,
            }),
          });
          clearSubmissionContext();
        }, remainingTime);
        return;
      }

      setPhase("failure");
      setMessage("报告生成状态异常，请稍后重试");
      isPollingRef.current = false;
    } catch (error: unknown) {
      if (!isActive()) return;
      logger.ERROR("[AnalysisWait] 等待流程失败", error);
      saveSubmissionContext({
        requestId,
        testeeId: testeeIdFromUrl,
        assessmentKind,
        phase: "failed",
      });
      setPhase("failure");
      setMessage(getErrorMessage(error));
      isPollingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const params = Taro.getCurrentInstance().router?.params || {};
    const storedContext = getSubmissionContext();
    const routeAnswerSheetId = toText(params.a);
    const storedContextMatchesRoute = !routeAnswerSheetId
      || !storedContext.answersheetId
      || routeAnswerSheetId === storedContext.answersheetId;
    const resumeContext = storedContextMatchesRoute ? storedContext : {
      answersheetId: "",
      assessmentId: "",
      testeeId: "",
      requestId: "",
      assessmentKind: "",
      assessmentWaitStartedAt: 0,
      phase: "",
      statusMessage: "",
    };
    const routeAssessmentId = toText(params.aid || resumeContext.assessmentId);
    const resume = resolveAssessmentWaitResume({
      ...resumeContext,
      phase: routeAssessmentId ? "assessment_ready" : resumeContext.phase,
    });
    const flowParams: WaitFlowParams = {
      assessmentId: routeAssessmentId,
      answerSheetId: toText(params.a || resumeContext.answersheetId),
      testeeId: toText(params.t || resumeContext.testeeId),
      requestId: toText(params.request_id || resumeContext.requestId),
      taskId: toText(params.task_id),
      assessmentKind: toText(params.kind || resumeContext.assessmentKind),
      assessmentWaitStartedAt: resume.startedAt,
      initialPhase: resume.phase as ReportWaitPhase,
      initialStage: resume.stage,
      initialMessage: resume.message,
    };
    flowParamsRef.current = flowParams;

    logger.RUN("等待解析页面初始化", {
      assessmentId: flowParams.assessmentId,
      answersheetId: flowParams.answerSheetId,
      testeeId: flowParams.testeeId,
      requestId: flowParams.requestId,
    });

    if (!flowParams.answerSheetId) {
      setPhase("failure");
      setMessage("提交状态已失效，请重新提交或查看历史记录");
      return undefined;
    }

    if (flowParams.initialPhase === "failure") {
      isPollingRef.current = false;
      setPhase("failure");
      setStage(flowParams.initialStage);
      setMessage(flowParams.initialMessage);
      setFailureCanOpenReport(false);
    } else {
      void startWaitFlow(flowParams);
    }
    return () => {
      isPollingRef.current = false;
      runIdRef.current += 1;
    };
  }, [startWaitFlow]);

  useEffect(() => {
    if (phase !== "processing" && phase !== "delayed" && phase !== "degraded") {
      setDots("");
      return undefined;
    }
    const interval = setInterval(() => {
      setDots((current) => current.length >= 3 ? "" : `${current}.`);
    }, 500);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (!viewModel.showAnimation) {
      lottieInstanceRef.current?.destroy();
      lottieInstanceRef.current = null;
      return undefined;
    }
    if (lottieInstanceRef.current) return undefined;

    const initLottie = () => {
      try {
        Taro.createSelectorQuery()
          .select("#lottie-canvas")
          .fields({ node: true, size: true })
          .exec((results: CanvasQueryResult[]) => {
            const result = results[0];
            if (!result?.node) return;
            const canvas = result.node;
            const dpr = Taro.getSystemInfoSync().pixelRatio;
            canvas.width = Number(result.width || 0) * dpr;
            canvas.height = Number(result.height || 0) * dpr;
            lottie.setup(canvas);
            lottieInstanceRef.current = lottie.loadAnimation({
              loop: true,
              autoplay: true,
              animationData: carLoadingData,
              rendererSettings: {
                context: canvas.getContext("2d"),
                clearCanvas: true,
              },
            }) as LottieAnimationInstance;
          });
      } catch (error: unknown) {
        logger.WARN("Lottie 初始化失败", error);
      }
    };

    const timer = setTimeout(initLottie, 100);
    return () => {
      clearTimeout(timer);
      lottieInstanceRef.current?.destroy();
      lottieInstanceRef.current = null;
    };
  }, [viewModel.showAnimation]);

  const retry = () => {
    if (flowParamsRef.current) void startWaitFlow(flowParamsRef.current);
  };

  const openReport = () => {
    const params = flowParamsRef.current;
    if (!params?.assessmentId) {
      Taro.showToast({ title: "报告仍在生成中，请稍后再试", icon: "none" });
      return;
    }
    const reportRoute = isPersonalityAssessmentKind(params.assessmentKind)
      ? routes.personalityReport
      : routes.assessmentReport;
    Taro.redirectTo({
      url: reportRoute({
        a: params.answerSheetId,
        aid: params.assessmentId,
        t: params.testeeId,
        kind: resolveReportRedirectKind(params.assessmentKind),
        task_id: params.taskId || undefined,
      }),
    });
  };

  return (
    <>
      <PrivacyAuthorization />
      <PageShell tone="medical" scroll={false} contentClassName="analysis-wait-page">
        <SurfaceCard className="wait-container">
          {viewModel.showAnimation ? (
            <View className="loading-wrapper">
              <Canvas id="lottie-canvas" type="2d" className="lottie-animation" />
            </View>
          ) : null}

          {phase === "failure" ? (
            <StatePanel
              state="error"
              tone="medical"
              title={viewModel.title}
              description={viewModel.description}
              actionText={viewModel.canRetry ? "重新等待" : undefined}
              onAction={viewModel.canRetry ? retry : undefined}
              compact
            />
          ) : (
            <View className="wait-status">
              <Text className="wait-status__title">{viewModel.title}</Text>
              <Text className="wait-status__description">
                {viewModel.description}{phase === "success" ? "" : dots}
              </Text>
              {viewModel.stageLabel ? (
                <Text className="wait-status__stage">{viewModel.stageLabel}</Text>
              ) : null}
              {phase === "degraded" ? (
                <Text className="wait-status__notice">连接方式已自动切换，不影响报告生成结果。</Text>
              ) : null}
              {phase === "delayed" ? (
                <Text className="wait-status__notice">答卷已经可靠保存，无需重新提交。</Text>
              ) : null}
            </View>
          )}

          {phase === "failure" ? (
            <View className="wait-actions">
              {failureCanOpenReport ? (
                <ActionButton variant="secondary" tone="medical" block onClick={openReport}>
                  查看报告
                </ActionButton>
              ) : null}
              <ActionButton variant="ghost" tone="neutral" block onClick={() => Taro.navigateBack()}>
                返回
              </ActionButton>
            </View>
          ) : null}
        </SurfaceCard>
      </PageShell>
    </>
  );
};

export default AssessmentReportPendingPage;
