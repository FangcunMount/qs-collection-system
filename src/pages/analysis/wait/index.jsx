import React, { useEffect, useState, useRef } from "react";
import { View, Text, Canvas } from "@tarojs/components";
import Taro from "@tarojs/taro";
import lottie from "lottie-miniprogram";

import { waitAssessmentReport } from "../../../services/api/assessmentApi";
import { getLogger } from "../../../util/log";
import { PrivacyAuthorization } from "../../../components/privacyAuthorization/privacyAuthorization";
import { getSelectedTesteeId } from "../../../store";
import { request } from "../../../services/servers";
import config from "../../../config";
import carLoadingData from "../../../assets/lotties/car-loading-data.json";
import "./index.less";

const PAGE_NAME = "analysis_wait";
const logger = getLogger(PAGE_NAME);

// 最大轮询次数（防止无限轮询）
const MAX_POLLING_COUNT = 20;
// 每次轮询的超时时间（秒）
const POLLING_TIMEOUT = 15;

const AnalysisWait = () => {
  const [status, setStatus] = useState("waiting"); // waiting | success | error
  const [message, setMessage] = useState("正在解析测评报告，请稍候...");
  const [dots, setDots] = useState("");
  const pollingCountRef = useRef(0);
  const isPollingRef = useRef(false);
  const lottieInstanceRef = useRef(null);

  useEffect(() => {
    const params = Taro.getCurrentInstance().router.params;
    logger.RUN("等待解析页面初始化", { 
      assessmentId: params.aid, 
      answersheetId: params.a,
      testeeId: params.t
    });

    const assessmentId = params.aid;
    const answersheetId = params.a;
    const testeeIdFromUrl = params.t; // 从 URL 参数获取 testeeId

    if (!assessmentId) {
      logger.ERROR("缺少测评ID参数");
      setStatus("error");
      setMessage("参数错误，请重新提交");
      return;
    }

    // 开始轮询，传递 testeeId（如果有）
    startPolling(assessmentId, answersheetId, testeeIdFromUrl);
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
      // 使用 /answersheets/{id} 接口获取答卷详情，其中包含 testee_id
      const answersheet = await request(`/answersheets/${String(answersheetId)}`, {}, {
        host: config.collectionHost,
        needToken: true
      });
      
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
   * 开始轮询等待报告生成
   */
  const startPolling = async (assessmentId, answersheetId, testeeIdFromUrl) => {
    if (isPollingRef.current) {
      logger.WARN("轮询已在进行中，跳过");
      return;
    }

    isPollingRef.current = true;
    
    // 获取受试者ID
    const testeeId = await getTesteeId(testeeIdFromUrl, answersheetId);
    if (!testeeId) {
      logger.ERROR("未找到受试者ID");
      setStatus("error");
      setMessage("未找到受试者信息，请稍后重试");
      isPollingRef.current = false;
      return;
    }

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
          // 解析完成，直接跳转，保持"解析中"文案
          logger.RUN("报告解析完成，跳转到解析页面", { answersheetId });
          setStatus("success");
          // 保持"解析中"文案，不改变
          // 停止轮询，但保持动画播放
          isPollingRef.current = false;
          
          // 短暂延迟后跳转
          setTimeout(() => {
            Taro.redirectTo({
              url: `/pages/analysis/index?a=${answersheetId}`
            });
          }, 300); // 短暂延迟后跳转
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
                    if (answersheetId) {
                      Taro.redirectTo({
                        url: `/pages/analysis/index?a=${answersheetId}`
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

