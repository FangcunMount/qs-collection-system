import React, { useEffect, useState, useRef } from "react";
import { View, Text, Canvas } from "@tarojs/components";
import Taro from "@tarojs/taro";
import lottie from "lottie-miniprogram";

import { PrivacyAuthorization } from "@/shared/ui/PrivacyAuthorization";
import { routes } from "@/shared/config/routes";
import { ASSESSMENT_KIND, isPersonalityAssessmentKind } from "@/shared/lib/assessmentKind";
import { createReportWaitStrategy, formatReportWaitStageMessage } from "@/modules/assessment/services/reportWaitStrategy";
import { waitAssessmentReportLifecycle } from "@/modules/assessment/services/waitAssessmentReportLifecycle";
import { resolveTesteeIdForAnswerSheet } from "@/modules/assessment/lib/resolveTesteeId";
import {
  clearSubmissionContext,
  getSubmissionContext,
  saveSubmissionContext,
} from "@/modules/assessment/services/submissionContextStore";
import { getLogger } from "@/shared/lib/logger";
import carLoadingData from "@/assets/lotties/car-loading-data.json";
import "./AssessmentReportPendingPage.less";

const PAGE_NAME = "analysis_wait";
const logger = getLogger(PAGE_NAME);

// 等待 assessment 生成的最大轮询次数（与 wait*AssessmentId 默认一致）
const MAX_ASSESSMENT_LOOKUP_COUNT = 30;

const formatStageMessage = (strategy, stage, fallbackMessage) => {
  return strategy.formatStageMessage(stage, fallbackMessage);
};

const AnalysisWait = () => {
  const [status, setStatus] = useState("waiting"); // waiting | success | error
  const [message, setMessage] = useState("正在生成测评记录，请稍候...");
  const [stage, setStage] = useState("");
  const [dots, setDots] = useState("");
  const assessmentLookupCountRef = useRef(0);
  const isPollingRef = useRef(false);
  const lottieInstanceRef = useRef(null);
  const startTimeRef = useRef(Date.now()); // 记录页面开始时间
  const MIN_WAIT_TIME = 2000; // 最少等待时间 2 秒

  useEffect(() => {
    // 记录页面开始时间
    startTimeRef.current = Date.now();
    
    const params = Taro.getCurrentInstance().router.params || {};
    const storedContext = getSubmissionContext();
    logger.RUN("等待解析页面初始化", { 
      assessmentId: params.aid, 
      answersheetId: params.a,
      testeeId: params.t,
      requestId: params.request_id,
    });

    const assessmentId = params.aid || storedContext.assessmentId;
    const answersheetId = params.a || storedContext.answersheetId;
    const testeeIdFromUrl = params.t || storedContext.testeeId;
    const requestId = params.request_id || storedContext.requestId;
    const taskId = params.task_id;
    const assessmentKind = params.kind || storedContext.assessmentKind;

    if (!answersheetId && !requestId) {
      logger.ERROR("缺少 answersheet_id 和 request_id 参数");
      setStatus("error");
      setMessage("提交状态已失效，请重新提交或查看历史记录");
      return;
    }

    startWaitFlow(assessmentId, answersheetId, testeeIdFromUrl, requestId, taskId, assessmentKind);

    return () => {
      isPollingRef.current = false;
    };
  }, []);

  // 点动画效果
  useEffect(() => {
    if (status !== "waiting") return;

    const interval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return "";
        return prev + ".";
      });
    }, 500);

    return () => clearInterval(interval);
  }, [status]);

  // Lottie 动画初始化
  useEffect(() => {
    // 只在 waiting 或 success 状态时初始化/保持动画
    if (status !== "waiting" && status !== "success") {
      // 如果状态是 error，停止动画
      if (lottieInstanceRef.current) {
        lottieInstanceRef.current.destroy();
        lottieInstanceRef.current = null;
      }
      return;
    }

    // 如果动画已经初始化，不需要重新初始化
    if (lottieInstanceRef.current) {
      return;
    }

    const initLottie = () => {
      try {
        const query = Taro.createSelectorQuery();
        query.select('#lottie-canvas')
          .fields({ node: true, size: true })
          .exec((res) => {
            if (!res[0] || !res[0].node) {
              logger.WARN('未找到 canvas 节点，延迟重试');
              setTimeout(initLottie, 100);
              return;
            }

            const canvas = res[0].node;
            const dpr = Taro.getSystemInfoSync().pixelRatio;
            
            // 设置 canvas 尺寸
            canvas.width = res[0].width * dpr;
            canvas.height = res[0].height * dpr;

            // 初始化 lottie
            lottie.setup(canvas);

            // 创建 Lottie 动画实例
            const animation = lottie.loadAnimation({
              loop: true,
              autoplay: true,
              animationData: carLoadingData,
              rendererSettings: {
                context: canvas.getContext('2d'),
                clearCanvas: true,
              }
            });

            lottieInstanceRef.current = animation;
            logger.RUN('Lottie 动画初始化成功');
          });
      } catch (error) {
        logger.ERROR('Lottie 初始化失败:', error);
      }
    };

    // 延迟初始化，确保 DOM 已渲染
    const timer = setTimeout(initLottie, 100);

    return () => {
      clearTimeout(timer);
      if (lottieInstanceRef.current) {
        try {
          lottieInstanceRef.current.destroy();
        } catch (e) {
          console.error('销毁 Lottie 动画失败:', e);
        }
        lottieInstanceRef.current = null;
      }
    };
  }, [status]);

  const getTesteeId = async (testeeIdFromUrl, answersheetId) => {
    return resolveTesteeIdForAnswerSheet({
      testeeIdFromUrl,
      answersheetId,
      logger,
    });
  };

  const startWaitFlow = async (assessmentIdFromUrl, answersheetId, testeeIdFromUrl, requestId, taskId, assessmentKind) => {
    try {
      let testeeId = testeeIdFromUrl ? String(testeeIdFromUrl) : '';
      if (!testeeId) {
        testeeId = await getTesteeId(testeeIdFromUrl, answersheetId) || '';
      }
      if (!testeeId) {
        throw new Error('未找到受试者信息，请稍后重试');
      }

      const strategy = createReportWaitStrategy(assessmentKind);
      isPollingRef.current = true;
      setStage('queued');
      setMessage(formatStageMessage(strategy, 'queued'));

      const applyStatus = (statusData) => {
        const reportStage = statusData.stage;
        if (reportStage) {
          setStage(reportStage);
        }
        setMessage(formatStageMessage(strategy, reportStage, statusData.message));
      };

      const redirectToReport = (resolvedAssessmentId, resolvedAnswerSheetId) => {
        setStatus('success');
        isPollingRef.current = false;

        const elapsedTime = Date.now() - startTimeRef.current;
        const remainingTime = Math.max(0, MIN_WAIT_TIME - elapsedTime);

        logger.RUN('报告生成完成，准备跳转', {
          answersheetId: resolvedAnswerSheetId,
          assessmentId: resolvedAssessmentId,
          elapsedTime,
          remainingTime,
          assessmentKind: strategy.kind,
        });

        setTimeout(() => {
          Taro.redirectTo({
            url: strategy.reportRoute({
              a: resolvedAnswerSheetId,
              aid: resolvedAssessmentId,
              t: testeeId,
              kind: strategy.kind === ASSESSMENT_KIND.PERSONALITY ? ASSESSMENT_KIND.PERSONALITY : undefined,
              task_id: taskId || undefined,
            }),
          });
          clearSubmissionContext();
        }, remainingTime);
      };

      logger.RUN('[AnalysisWait] 开始等待（submit-status → WS/report-status）', {
        answersheetId,
        assessmentId: assessmentIdFromUrl || null,
        requestId: requestId || null,
        testeeId,
        assessmentKind,
      });

      const result = await waitAssessmentReportLifecycle({
        strategy,
        assessmentKind,
        assessmentId: assessmentIdFromUrl,
        answerSheetId: answersheetId,
        requestId,
        testeeId,
        onStatus: applyStatus,
        onSubmissionReady: ({ requestId: resolvedRequestId, answersheetId: resolvedAnswerSheetId, assessmentId: resolvedAssessmentId }) => {
          saveSubmissionContext({
            requestId: resolvedRequestId,
            testeeId,
            assessmentKind: strategy.kind,
            answersheetId: resolvedAnswerSheetId,
            assessmentId: resolvedAssessmentId,
            phase: 'assessment_ready',
          });
        },
        shouldContinue: () => isPollingRef.current,
        logger,
        assessmentLookupOptions: {
          maxAttempts: MAX_ASSESSMENT_LOOKUP_COUNT,
          onAttempt: (attempt) => {
            assessmentLookupCountRef.current = attempt;
            setMessage('正在关联测评记录，请稍候...');
          },
        },
        allowLegacyListFallback: !requestId,
      });

      if (result.cancelled || !isPollingRef.current) {
        return;
      }

      const statusData = result.statusData || {};
      const resolvedAssessmentId = result.assessmentId;
      const resolvedAnswerSheetId = result.answerSheetId || answersheetId;

      saveSubmissionContext({
        requestId,
        testeeId,
        assessmentKind: strategy.kind,
        answersheetId: resolvedAnswerSheetId,
        assessmentId: resolvedAssessmentId,
        phase: 'report_processing',
      });

      logger.RUN('[AnalysisWait] 等待结束', {
        source: result.source,
        assessmentId: resolvedAssessmentId,
        status: statusData.status,
        stage: statusData.stage,
      });

      if (strategy.isFailed(statusData.status)) {
        setStatus('error');
        setMessage(statusData.reason || statusData.message || '报告生成失败，请稍后重试');
        isPollingRef.current = false;
        return;
      }

      if (strategy.isCompleted(statusData.status) && resolvedAssessmentId) {
        redirectToReport(resolvedAssessmentId, resolvedAnswerSheetId);
        return;
      }

      setStatus('error');
      setMessage('报告生成状态异常，请稍后重试');
      isPollingRef.current = false;
    } catch (error) {
      logger.ERROR('[AnalysisWait] 等待流程失败', error);
      saveSubmissionContext({
        requestId,
        testeeId: testeeIdFromUrl,
        assessmentKind,
        phase: 'failed',
      });
      setStatus('error');
      setMessage(error?.message || '加载测评状态失败，请稍后重试');
      isPollingRef.current = false;
    }
  };

  return (
    <>
      <PrivacyAuthorization />
      <View className="analysis-wait-page">
        <View className="wait-container">
          {/* Lottie 动画 - 在 waiting 和 success 状态都显示 */}
          {(status === "waiting" || status === "success") && (
            <View className="loading-wrapper">
              <Canvas
                id="lottie-canvas"
                type="2d"
                className="lottie-animation"
              />
            </View>
          )}

          {/* 状态文本 */}
          <View className="status-text-wrapper">
            <Text className="status-text">
              {message}{dots}
            </Text>
          </View>

          {/* 提示信息 */}
          {status === "waiting" && (
            <View className="tip-wrapper">
              <Text className="tip-text">
                {stage ? `当前阶段：${stage}` : "解析可能需要几分钟时间，请耐心等待"}
              </Text>
            </View>
          )}

          {/* 错误状态 */}
          {status === "error" && (
            <View className="error-wrapper">
              <View className="error-icon">
                <Text>⚠</Text>
              </View>
              <View className="error-buttons">
                <View
                  className="error-button"
                  onClick={() => {
                    const params = Taro.getCurrentInstance().router.params;
                    const answersheetId = params.a;
                    const assessmentId = params.aid;
                    const taskId = params.task_id;
                    const assessmentKind = params.kind;
                    if (!assessmentId) {
                      Taro.showToast({
                        title: '报告仍在生成中，请稍后再试',
                        icon: 'none',
                      });
                      return;
                    }
                    const reportRoute = isPersonalityAssessmentKind(assessmentKind)
                      ? routes.personalityReport
                      : routes.assessmentReport;
                    if (answersheetId) {
                      Taro.redirectTo({
                        url: reportRoute({
                          a: answersheetId,
                          aid: assessmentId,
                          t: params.t,
                          kind: assessmentKind,
                          task_id: taskId || undefined,
                        })
                      });
                    } else {
                      Taro.navigateBack();
                    }
                  }}
                >
                  <Text className="error-button-text">查看报告</Text>
                </View>
                <View
                  className="error-button secondary"
                  onClick={() => {
                    Taro.navigateBack();
                  }}
                >
                  <Text className="error-button-text">返回</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>
    </>
  );
};

export default AnalysisWait;
