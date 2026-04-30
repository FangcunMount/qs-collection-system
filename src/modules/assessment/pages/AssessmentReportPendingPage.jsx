import React, { useEffect, useState, useRef } from "react";
import { View, Text, Canvas } from "@tarojs/components";
import Taro from "@tarojs/taro";
import lottie from "lottie-miniprogram";

import { PrivacyAuthorization } from "@/shared/ui/PrivacyAuthorization";
import { routes } from "@/shared/config/routes";
import { getAssessmentByAnswersheetId, waitAssessmentReport } from "@/services/api/assessments";
import { getAssessmentResponse } from "@/services/api/assessmentResponses";
import { getLogger } from "@/shared/lib/logger";
import { getSelectedTesteeId } from "@/shared/stores/testees";
import carLoadingData from "@/assets/lotties/car-loading-data.json";
import "./AssessmentReportPendingPage.less";

const PAGE_NAME = "analysis_wait";
const logger = getLogger(PAGE_NAME);

// 最大轮询次数（防止无限轮询）
const MAX_POLLING_COUNT = 20;
// 每次轮询的超时时间（秒）
const POLLING_TIMEOUT = 15;
// 等待 assessment 生成的最大轮询次数
const MAX_ASSESSMENT_LOOKUP_COUNT = 30;
const ASSESSMENT_LOOKUP_INTERVAL = 1000;
const ASSESSMENT_NOT_READY_CODES = new Set(["404", "112001"]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const shouldRetryAssessmentLookup = (error) => {
  const code = String(error?.code ?? error?.data?.code ?? error?.statusCode ?? "");
  if (ASSESSMENT_NOT_READY_CODES.has(code)) {
    return true;
  }

  const message = String(error?.message ?? error?.data?.message ?? "").toLowerCase();
  return message.includes("assessment not found") || message.includes("测评不存在");
};

const AnalysisWait = () => {
  const [status, setStatus] = useState("waiting"); // waiting | success | error
  const [message, setMessage] = useState("正在解析测评报告，请稍候...");
  const [dots, setDots] = useState("");
  const pollingCountRef = useRef(0);
  const assessmentLookupCountRef = useRef(0);
  const isPollingRef = useRef(false);
  const lottieInstanceRef = useRef(null);
  const startTimeRef = useRef(Date.now()); // 记录页面开始时间
  const MIN_WAIT_TIME = 2000; // 最少等待时间 2 秒

  useEffect(() => {
    // 记录页面开始时间
    startTimeRef.current = Date.now();
    
    const params = Taro.getCurrentInstance().router.params;
    logger.RUN("等待解析页面初始化", { 
      assessmentId: params.aid, 
      answersheetId: params.a,
      testeeId: params.t
    });

    const assessmentId = params.aid;
    const answersheetId = params.a;
    const testeeIdFromUrl = params.t; // 从 URL 参数获取 testeeId
    const taskId = params.task_id;

    if (!answersheetId) {
      logger.ERROR("缺少答卷ID参数");
      setStatus("error");
      setMessage("参数错误，请重新提交");
      return;
    }

    startWaitFlow(assessmentId, answersheetId, testeeIdFromUrl, taskId);
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

  /**
   * 获取受试者ID
   * 优先级：URL 参数 > store > 通过 answersheetId 获取
   */
  const getTesteeId = async (testeeIdFromUrl, answersheetId) => {
    // 1. 优先使用 URL 参数中的 testeeId
    if (testeeIdFromUrl) {
      logger.RUN("使用 URL 参数中的 testeeId", { testeeId: testeeIdFromUrl });
      return String(testeeIdFromUrl);
    }

    // 2. 从 store 获取
    let testeeId = getSelectedTesteeId();
    if (testeeId) {
      logger.RUN("从 store 获取 testeeId", { testeeId });
      return testeeId;
    }

    // 3. 如果 store 中没有，通过 answersheetId 获取答卷详情
    try {
      logger.RUN("从 store 未找到 testeeId，通过 answersheetId 获取", { answersheetId });
      const answersheet = await getAssessmentResponse(answersheetId);
      
      if (answersheet && answersheet.testee_id) {
        logger.RUN("通过 answersheetId 获取到 testeeId", { testeeId: answersheet.testee_id });
        return String(answersheet.testee_id);
      }
    } catch (error) {
      logger.ERROR("通过 answersheetId 获取 testeeId 失败", error);
    }

    return null;
  };

  /**
   * 等待 assessment 生成
   */
  const resolveAssessmentContext = async (assessmentIdFromUrl, answersheetId, testeeIdFromUrl) => {
    let assessmentId = assessmentIdFromUrl ? String(assessmentIdFromUrl) : "";
    let testeeId = testeeIdFromUrl ? String(testeeIdFromUrl) : "";

    if (!assessmentId) {
      setMessage("正在生成测评记录，请稍候...");

      while (assessmentLookupCountRef.current < MAX_ASSESSMENT_LOOKUP_COUNT) {
        assessmentLookupCountRef.current += 1;

        try {
          const detail = await getAssessmentByAnswersheetId(answersheetId, {
            suppressErrorToast: true
          });

          if (detail?.id) {
            assessmentId = String(detail.id);
            testeeId = testeeId || (detail.testee_id ? String(detail.testee_id) : "");
            logger.RUN("[AnalysisWait] 获取到 assessment", {
              answersheetId,
              assessmentId,
              testeeId,
              attempt: assessmentLookupCountRef.current
            });
            break;
          }

          logger.WARN("[AnalysisWait] assessment 查询成功但结果为空，继续等待", {
            answersheetId,
            attempt: assessmentLookupCountRef.current
          });
        } catch (error) {
          if (!shouldRetryAssessmentLookup(error)) {
            throw error;
          }

          logger.RUN("[AnalysisWait] assessment 暂未生成，继续等待", {
            answersheetId,
            attempt: assessmentLookupCountRef.current,
            code: error?.code,
            message: error?.message
          });
        }

        await sleep(ASSESSMENT_LOOKUP_INTERVAL);
      }
    }

    if (!assessmentId) {
      throw new Error("测评记录生成时间过长，请稍后查看报告");
    }

    if (!testeeId) {
      testeeId = await getTesteeId(testeeIdFromUrl, answersheetId);
    }

    if (!testeeId) {
      throw new Error("未找到受试者信息，请稍后重试");
    }

    return { assessmentId, testeeId };
  };

  /**
   * 开始轮询等待报告生成
   */
  const startPolling = async (assessmentId, answersheetId, testeeId, taskId) => {
    if (isPollingRef.current) {
      logger.WARN("轮询已在进行中，跳过");
      return;
    }

    isPollingRef.current = true;
    pollingCountRef.current = 0;
    setMessage("正在解析测评报告，请稍候...");

    const poll = async () => {
      try {
        pollingCountRef.current += 1;
        logger.RUN(`开始第 ${pollingCountRef.current} 次轮询`, { 
          assessmentId, 
          testeeId 
        });

        const result = await waitAssessmentReport(assessmentId, testeeId, POLLING_TIMEOUT);
        const statusData = result.data || result;
        const reportStatus = statusData.status;

        logger.RUN("轮询结果", { 
          status: reportStatus, 
          pollingCount: pollingCountRef.current 
        });

        if (reportStatus === "interpreted") {
          // 解析完成，保持"解析中"文案
          logger.RUN("报告解析完成，跳转到解析页面", { answersheetId });
          setStatus("success");
          // 停止轮询，但保持动画播放
          isPollingRef.current = false;
          
          // 计算已经等待的时间
          const elapsedTime = Date.now() - startTimeRef.current;
          const remainingTime = Math.max(0, MIN_WAIT_TIME - elapsedTime);
          
          logger.RUN("等待时间计算", { 
            elapsedTime, 
            remainingTime, 
            minWaitTime: MIN_WAIT_TIME 
          });
          
          // 确保至少等待 2 秒
          setTimeout(() => {
            Taro.redirectTo({
              url: routes.assessmentReport({
                a: answersheetId,
                task_id: taskId || undefined,
              })
            });
          }, remainingTime);
        } else if (reportStatus === "failed") {
          // 解析失败
          logger.ERROR("报告解析失败", { statusData });
          setStatus("error");
          setMessage("解析失败，请稍后重试");
          isPollingRef.current = false;
        } else if (pollingCountRef.current >= MAX_POLLING_COUNT) {
          // 达到最大轮询次数
          logger.WARN("达到最大轮询次数，停止轮询", { 
            maxCount: MAX_POLLING_COUNT 
          });
          setStatus("error");
          setMessage("解析时间过长，请稍后查看报告");
          isPollingRef.current = false;
        } else {
          // 继续轮询
          setTimeout(() => {
            poll();
          }, 1000); // 等待1秒后继续下一次轮询
        }
      } catch (error) {
        logger.ERROR("轮询出错", error);
        
        // 如果是网络错误或超时，继续重试
        if (pollingCountRef.current < MAX_POLLING_COUNT) {
          logger.RUN("轮询出错，继续重试", { 
            error: error.message,
            pollingCount: pollingCountRef.current 
          });
          setTimeout(() => {
            poll();
          }, 2000); // 出错后等待2秒再重试
        } else {
          setStatus("error");
          setMessage("网络错误，请检查网络连接后重试");
          isPollingRef.current = false;
        }
      }
    };

    // 开始第一次轮询
    poll();
  };

  const startWaitFlow = async (assessmentIdFromUrl, answersheetId, testeeIdFromUrl, taskId) => {
    try {
      const context = await resolveAssessmentContext(
        assessmentIdFromUrl,
        answersheetId,
        testeeIdFromUrl
      );

      logger.RUN("[AnalysisWait] 进入报告等待轮询", {
        answersheetId,
        assessmentId: context.assessmentId,
        testeeId: context.testeeId
      });

      startPolling(context.assessmentId, answersheetId, context.testeeId, taskId);
    } catch (error) {
      logger.ERROR("[AnalysisWait] 等待流程初始化失败", error);
      setStatus("error");
      setMessage(error?.message || "加载测评状态失败，请稍后重试");
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
                解析可能需要几分钟时间，请耐心等待
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
                    const taskId = params.task_id;
                    if (answersheetId) {
                      Taro.redirectTo({
                        url: routes.assessmentReport({
                          a: answersheetId,
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
