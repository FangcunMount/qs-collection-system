import React, { useEffect, useState } from "react";
import Taro, { useReady, useRouter, useShareAppMessage } from "@tarojs/taro";
import { View, Text, Image, ScrollView, Picker } from "@tarojs/components";

import { ROUTES, routes } from "@/shared/config/routes";
import { getAssessmentEntryContext, setAssessmentEntryContext } from "@/shared/stores/assessmentEntry";
import {
  getSelectedTesteeId,
  getTesteeList as getStoredTesteeList,
  refreshTesteeList,
  setSelectedTesteeId,
  subscribeTesteeStore,
} from "@/shared/stores/testees";
import { PrivacyAuthorization } from "@/shared/ui/PrivacyAuthorization";
import { requestPlanSubscribe } from "@/shared/ui/PlanSubscribeConfirm";
import QuestionnaireForm from "../../questionnaire/components/QuestionnaireForm";
import SinglePageQuestionnaire from "../../questionnaire/components/SinglePageQuestionnaire";
import { getValidQuestionCount, getEstimatedTime } from "../../questionnaire/lib/questionUtils";
import "./AssessmentFillPage.less";

import { parsingScene } from "@/shared/lib/scene";
import { getLogger } from "@/shared/lib/logger";
import { getMiniProgramEntryParams } from "@/services/api/miniProgramEntries";
import { resolveAssessmentEntry } from "@/services/api/assessmentEntries";
import { getQuestionnaire } from "@/services/api/questionnaires";
import { getTestee } from "@/services/api/testees";

const PAGE_NAME = "questionnaire_fill";
const logger = getLogger(PAGE_NAME);

const INVALID_ENTRY_STATUSES = new Set(["inactive", "disabled", "revoked", "expired"]);

const resolveEntryStatusText = (status) => {
  switch (status) {
    case "inactive":
    case "disabled":
      return "当前入口已停用";
    case "revoked":
      return "当前入口已失效";
    case "expired":
      return "当前入口已过期";
    default:
      return "";
  }
};

const buildEntryErrorUrl = ({ title, text, desc, buttonText, buttonUrl }) => {
  return routes.systemError({ title, text, desc, buttonText, buttonUrl });
};

const redirectToEntryError = (options) => {
  Taro.redirectTo({ url: buildEntryErrorUrl(options) });
};

const hasEntryContext = (context) => {
  if (!context) return false;
  return Boolean(
    context.mpqrcodeid ||
      context.entry_title ||
      context.entry_description ||
      context.clinician_name ||
      context.target_code
  );
};

const isAssessmentEntryToken = (value) => /^ae_[A-Za-z0-9_]+$/.test(String(value || "").trim());

const toResolvedEntryStatus = (entry) => {
  if (!entry) return "";
  if (!entry.is_active) return "inactive";
  if (entry.expires_at && new Date(entry.expires_at).getTime() <= Date.now()) return "expired";
  return "active";
};

const mapResolvedAssessmentEntry = (token, result) => {
  const entry = result?.entry || {};
  const clinician = result?.clinician || {};
  const targetCode = entry.target_code || "";
  const targetType = entry.target_type || "";
  const targetVersion = entry.target_version || "";
  const clinicianName = clinician.name || "";
  const clinicianTitle = clinician.title || clinician.clinician_type || "";

  return {
    token,
    q: targetCode,
    target_code: targetCode,
    target_type: targetType,
    target_version: targetVersion,
    entry_title: clinicianName ? `${clinicianName} 推荐测评` : "扫码测评入口",
    entry_description: targetCode ? `来源入口 · ${targetCode}` : "请按入口指引完成测评。",
    entry_status: toResolvedEntryStatus(entry),
    clinician_name: clinicianName,
    clinician_title: clinicianTitle,
    raw: result
  };
};

const handleEntryParams = params => {
  return new Promise((resolve, reject) => {
    if (params.token && isAssessmentEntryToken(params.token)) {
      resolveAssessmentEntry(params.token)
        .then(result => {
          resolve(mapResolvedAssessmentEntry(params.token, result));
        })
        .catch(reject);
      return;
    }

    if (!params.scene) {
      return resolve(params);
    }

    if (!String(params.scene).includes("=") && isAssessmentEntryToken(params.scene)) {
      resolveAssessmentEntry(params.scene)
        .then(result => {
          resolve(mapResolvedAssessmentEntry(params.scene, result));
        })
        .catch(reject);
      return;
    }

    const np = parsingScene(params.scene);
    if (!np.mpqrcodeid) {
      return resolve(np);
    }

  getMiniProgramEntryParams(np.mpqrcodeid)
      .then(result => {
        resolve({
          ...np,
          ...(result.entry_data || {})
        });
      })
      .catch(err => {
        reject(err);
      });
  });
};

const resolvePlanTaskId = (params, context) => {
  return String(
    context?.task_id ||
      context?.raw?.task_id ||
      params?.task_id ||
      ""
  );
};

export default function Index() {
  const [questionnaireCode, setQuestionnaireCode] = useState(null);
  const [subSignid, setSubSignid] = useState("");
  
  // 状态管理
  const [currentStep, setCurrentStep] = useState('loading'); // loading | ready | filling
  const [questionnaire, setQuestionnaire] = useState(null);
  const [testeeInfo, setTesteeInfo] = useState(null);
  const [testeeList, setTesteeList] = useState([]);
  const [selectedTesteeId, setSelectedTesteeIdState] = useState(null);
  const [entryContext, setEntryContextState] = useState(() => getAssessmentEntryContext());

  const canSubmit = true;
  const [isSinglePage, setIsSinglePage] = useState(false);

  const paramData = useRouter().params;
  const planTaskId = resolvePlanTaskId(paramData, entryContext);

  // 订阅 testee store 变化
  useEffect(() => {
    const unsubscribe = subscribeTesteeStore(({ testeeList: newTesteeList, selectedTesteeId: newSelectedId }) => {
      setTesteeList(newTesteeList);
      setSelectedTesteeIdState(newSelectedId);
    });
    return unsubscribe;
  }, []);

  useReady(() => {
    logger.RUN("did show <RUN>, params: ", { ...paramData });

    Taro.showLoading({ mask: true });

    handleEntryParams(paramData).then(result => {
      logger.RUN("did show <RUN>, cleared params: ", result);
      if (paramData.scene || hasEntryContext(result)) {
        setAssessmentEntryContext(result);
        setEntryContextState(getAssessmentEntryContext());
      }
      const {
        q: nextQuestionnaireCode,
        t: testeeid,
        signid
      } = result;

      if ((paramData.scene || hasEntryContext(result)) && result?.entry_status && INVALID_ENTRY_STATUSES.has(result.entry_status)) {
        redirectToEntryError({
          title: "入口暂不可用",
          text: resolveEntryStatusText(result.entry_status),
          desc: "请联系推荐人员获取新的测评入口，或返回首页重新选择量表。",
          buttonText: "返回首页",
          buttonUrl: routes.tabHome()
        });
        return;
      }

      if ((paramData.scene || hasEntryContext(result)) && !result?.q) {
        redirectToEntryError({
          title: "入口内容不存在",
          text: "当前入口未找到可填写的问卷或量表",
          desc: "该入口可能已失效，或对应内容已下线。",
          buttonText: "返回首页",
          buttonUrl: routes.tabHome()
        });
        return;
      }

      signid && setSubSignid(signid);
      result.sp && setIsSinglePage(result.sp === "1");

      beforeEach({ questionnaireCode: nextQuestionnaireCode, testeeid, signid }, async () => {
        setQuestionnaireCode(nextQuestionnaireCode);
        await initPageData(nextQuestionnaireCode, testeeid, result);
      });
    }).catch((error) => {
      console.error('解析入口参数失败:', error);
      redirectToEntryError({
        title: "入口解析失败",
        text: "当前二维码或入口链接无法识别",
        desc: "请重新扫码，或联系推荐人员确认入口是否有效。",
        buttonText: "返回首页",
        buttonUrl: routes.tabHome()
      });
    });
  }, []);

  useShareAppMessage(() => ({}));

  /**
   * 初始化页面数据
   * 1. 重新初始化 testee store
   * 2. 根据 testee 数量决定是否自动选择
   * 3. 加载问卷数据
   */
  const initPageData = async (nextQuestionnaireCode, explicitTesteeId, entryParams) => {
    try {
      // 重新初始化 testee store
      await refreshTesteeList();
      
      let storedList = getStoredTesteeList();
      
      // 如果没有档案
      if (!storedList.length) {
        Taro.hideLoading();
        const params = {
          submitClose: "0",
          goUrl: ROUTES.assessmentFill,
          goParams: JSON.stringify(entryParams || paramData)
        };
        Taro.redirectTo({ url: routes.testeeCreate(params) });
        return;
      }

      // 如果有明确的 testeeid，使用它
      if (explicitTesteeId) {
        setSelectedTesteeId(explicitTesteeId);
        await loadQuestionnaire(nextQuestionnaireCode, explicitTesteeId, entryParams);
        return;
      }

      // 根据档案数量决定是否自动选择
      if (storedList.length === 1) {
        // 只有一个档案，自动选择
        const singleTesteeId = storedList[0].id;
        setSelectedTesteeId(singleTesteeId);
        await loadQuestionnaire(nextQuestionnaireCode, singleTesteeId, entryParams);
      } else {
        // 多个档案，清空选中状态，让用户选择
        setSelectedTesteeId(null);
        setTesteeList(storedList);
        // 加载问卷信息（不加载档案信息）
        await loadQuestionnaireOnly(nextQuestionnaireCode, entryParams);
      }
    } catch (error) {
      console.error('初始化页面数据失败:', error);
      Taro.hideLoading();
      Taro.showToast({ title: '加载失败，请重试', icon: 'none' });
    }
  };

  /**
   * 只加载问卷信息（不加载档案信息）
   */
  const loadQuestionnaireOnly = async (nextQuestionnaireCode, entryParams) => {
    try {
      const questionnaireData = await getQuestionnaire(nextQuestionnaireCode);
      setQuestionnaire(questionnaireData);
      setCurrentStep('ready'); // 进入准备步骤，等待用户选择档案
      Taro.hideLoading();
    } catch (error) {
      console.error('加载问卷失败:', error);
      Taro.hideLoading();
      if (hasEntryContext(entryParams)) {
        redirectToEntryError({
          title: "入口内容暂不可用",
          text: "当前入口对应的量表或问卷无法打开",
          desc: "内容可能已下线，或该入口已失效。",
          buttonText: "返回首页",
          buttonUrl: routes.tabHome()
        });
        return;
      }
      Taro.showToast({ title: '加载问卷失败，请重试', icon: 'none' });
    }
  };

  /**
   * 加载问卷和档案信息
   */
  const loadQuestionnaire = async (nextQuestionnaireCode, testeeId, entryParams) => {
    try {
      // 并行加载问卷和档案信息
      const [questionnaireData, testeeData] = await Promise.all([
        getQuestionnaire(nextQuestionnaireCode),
        getTestee(testeeId)
      ]);

      setQuestionnaire(questionnaireData);
      setTesteeInfo(testeeData);
      setCurrentStep('ready'); // 进入准备步骤
      
      Taro.hideLoading();
    } catch (error) {
      console.error('加载数据失败:', error);
      Taro.hideLoading();
      if (hasEntryContext(entryParams)) {
        redirectToEntryError({
          title: "入口内容暂不可用",
          text: "当前入口对应的量表或档案信息无法加载",
          desc: "请稍后重试，或联系推荐人员确认入口状态。",
          buttonText: "返回首页",
          buttonUrl: routes.tabHome()
        });
        return;
      }
      Taro.showToast({ title: '加载失败，请重试', icon: 'none' });
    }
  };

  /**
   * 选择档案
   */
  const handleTesteeChange = async (testeeId) => {
    if (!testeeId) return;
    
    setSelectedTesteeId(testeeId);
    
    // 加载选中的档案信息
    try {
      const testeeData = await getTestee(testeeId);
      setTesteeInfo(testeeData);
    } catch (error) {
      console.error('加载档案信息失败:', error);
      Taro.showToast({ title: '加载档案信息失败', icon: 'none' });
    }
  };

  /**
   * 开始填写问卷
   */
  const handleStartFill = async () => {
    if (entryContext?.entry_status && INVALID_ENTRY_STATUSES.has(entryContext.entry_status)) {
      redirectToEntryError({
        title: "入口暂不可用",
        text: resolveEntryStatusText(entryContext.entry_status),
        desc: "请联系推荐人员获取新的测评入口，或返回首页重新选择量表。",
        buttonText: "返回首页",
        buttonUrl: routes.tabHome()
      });
      return;
    }

    if (!selectedTesteeId) {
      Taro.showToast({ title: '请先选择档案', icon: 'none' });
      return;
    }

    if (!testeeInfo) {
      Taro.showToast({ title: '档案信息加载中，请稍候', icon: 'none' });
      return;
    }

    try {
      const subscribeResult = await requestPlanSubscribe({
        taskId: planTaskId,
        planName: entryContext?.plan_name,
        entryTitle: entryContext?.entry_title || questionnaire?.title,
        clinicianName: entryContext?.clinician_name,
        entryContext
      });

      logger.RUN('[Fill] 开始测评前触发订阅提醒', subscribeResult);

      if (subscribeResult.status === 'accepted') {
        Taro.showToast({
          title: '已订阅下一次测评开放提醒',
          icon: 'success'
        });
      } else if (subscribeResult.status === 'ban') {
        Taro.showToast({
          title: '请在微信设置中开启测评提醒',
          icon: 'none'
        });
      }
    } catch (error) {
      logger.WARN('[Fill] 开始测评前触发订阅提醒失败', error);
      Taro.showToast({
        title: String(error?.errMsg || error?.message || '订阅失败，请稍后重试'),
        icon: 'none'
      });
    }

    // 根据问卷类型和题目数量决定是否使用单页单题模式
    const questionCount = questionnaire?.questions?.length || 0;
    const questionnaireType = questionnaire?.type;
    
    // 量表且题目数少于20时，使用单页单题模式
    if (questionnaireType === 'MedicalScale' && questionCount < 20 && !isSinglePage) {
      setIsSinglePage(true);
    }
    
    setCurrentStep('filling');
  };

  const beforeEach = async (params, next) => {
    const { testeeid, signid } = params;

    // 注意：signid 功能已废弃，不再支持通过 signid 查询答卷ID
    // 如果将来需要恢复此功能，需要后端提供新的 API 接口

    Taro.hideLoading();
    next();
  };

  /**
   * 答卷提交成功回调
   */
  const writedCallback = async (answersheetid, assessmentId) => {
    const questionnaireType = questionnaire?.type;
    const selectedTesteeId = getSelectedTesteeId();
    const taskIdParam = planTaskId ? `&task_id=${encodeURIComponent(planTaskId)}` : '';
    
    logger.RUN('[Fill] 答卷提交成功', { 
      answersheetid, 
      assessmentId,
      questionnaireType,
      testeeId: selectedTesteeId 
    });

    if (questionnaireType === 'Survey') {
      // 调查问卷：跳转到答卷详情页面
      Taro.redirectTo({
        url: routes.assessmentResponse({
          a: answersheetid,
          task_id: planTaskId || undefined,
        })
      });
    } else if (questionnaireType === 'MedicalScale') {
      logger.RUN('[Fill] 量表提交成功，跳转等待页', {
        answersheetid,
        assessmentId,
        hasAssessmentId: !!assessmentId,
        testeeId: selectedTesteeId
      });
      Taro.redirectTo({
        url: routes.assessmentReportPending({
          a: answersheetid,
          aid: assessmentId || undefined,
          t: selectedTesteeId || undefined,
          task_id: planTaskId || undefined,
        })
      });
    } else {
      // 未知类型或旧数据：默认跳转到答卷详情页面
      logger.WARN('[Fill] 问卷类型未知，默认跳转到答卷详情', { questionnaireType });
      Taro.redirectTo({
        url: routes.assessmentResponse({
          a: answersheetid,
          task_id: planTaskId || undefined,
        })
      });
    }
  };

  const handleAddChild = () => {
    const params = {
      submitClose: "0",
      goUrl: ROUTES.assessmentFill,
      goParams: JSON.stringify(paramData)
    };
    Taro.redirectTo({ url: routes.testeeCreate(params) });
  };

  // 准备档案选择器的选项
  const testeePickerOptions = testeeList.map(item => ({
    label: item.legalName || item.name || '未命名',
    value: item.id
  }));

  const selectedTesteeIndex = testeeList.findIndex(item => item.id === selectedTesteeId);
  const entryStatusText = resolveEntryStatusText(entryContext?.entry_status);
  const startDisabled = !selectedTesteeId || Boolean(entryStatusText);

  return (
    <>
      {/* 准备步骤：显示问卷信息和档案选择器 */}
      {currentStep === 'ready' && (
        <View className="fill-ready-page">
          <ScrollView scrollY className="fill-ready-scroll">
            {/* 问卷封面图 */}
            <View className="questionnaire-cover">
              <Image
                className="cover-image"
                src={questionnaire?.thumbnail || 'https://picsum.photos/400/400'}
                mode="aspectFill"
              />
            </View>

            {/* 问卷标题信息 */}
            <View className="questionnaire-header">
              <Text className="questionnaire-title">{questionnaire?.title}</Text>
              {questionnaire?.subtitle && (
                <Text className="questionnaire-subtitle">{questionnaire.subtitle}</Text>
              )}
              
              <View className="questionnaire-meta">
                <View className="meta-item">
                  <Text className="meta-icon">📄</Text>
                  <Text className="meta-text">
                    {getValidQuestionCount(questionnaire?.questions) || 0}道题
                  </Text>
                </View>
                <View className="meta-item">
                  <Text className="meta-icon">⏱</Text>
                  <Text className="meta-text">
                    预计{getEstimatedTime(questionnaire)}分钟
                  </Text>
                </View>
              </View>
            </View>

            {/* 档案选择区域 */}
            <View className="testee-selector-section">
              <Text className="section-title">选择档案</Text>
              {testeeList.length > 0 ? (
                <View className="testee-selector">
                  <Picker
                    mode="selector"
                    range={testeePickerOptions}
                    rangeKey="label"
                    value={selectedTesteeIndex >= 0 ? selectedTesteeIndex : 0}
                    onChange={(e) => {
                      const selectedIndex = e.detail.value;
                      const selectedTestee = testeeList[selectedIndex];
                      if (selectedTestee) {
                        handleTesteeChange(selectedTestee.id);
                      }
                    }}
                  >
                    <View className="testee-picker">
                      <Text className="testee-picker-label">
                        {selectedTesteeId && testeeInfo 
                          ? (testeeInfo.legalName || testeeInfo.name || '未命名')
                          : '请选择档案'}
                      </Text>
                      <Text className="testee-picker-arrow">▼</Text>
                    </View>
                  </Picker>
                  
                  {/* 显示选中的档案信息 */}
                  {testeeInfo && (
                    <View className="testee-info-card">
                      <View className="testee-info-item">
                        <Text className="testee-info-label">姓名</Text>
                        <Text className="testee-info-value">{testeeInfo.legalName || testeeInfo.name || '未命名'}</Text>
                      </View>
                      <View className="testee-info-item">
                        <Text className="testee-info-label">性别</Text>
                        <Text className="testee-info-value">
                          {testeeInfo.gender === 1 ? "男" : testeeInfo.gender === 2 ? "女" : "其他"}
                        </Text>
                      </View>
                      {testeeInfo.birthday && (
                        <View className="testee-info-item">
                          <Text className="testee-info-label">出生日期</Text>
                          <Text className="testee-info-value">{testeeInfo.birthday}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              ) : (
                <View className="testee-empty">
                  <Text className="testee-empty-text">暂无档案</Text>
                  <View className="testee-add-button" onClick={handleAddChild}>
                    <Text className="testee-add-button-text">+ 添加档案</Text>
                  </View>
                </View>
              )}
            </View>

            {hasEntryContext(entryContext) && (
              <View className="entry-context-section">
                <Text className="section-title">当前入口来源</Text>
                <View className="entry-context-card">
                  {entryContext?.entry_title && (
                    <Text className="entry-context-title">{entryContext.entry_title}</Text>
                  )}
                  {entryContext?.clinician_name && (
                    <Text className="entry-context-meta">
                      {entryContext.clinician_name}
                      {entryContext.clinician_title ? ` · ${entryContext.clinician_title}` : ''}
                    </Text>
                  )}
                  {entryContext?.entry_description && (
                    <Text className="entry-context-desc">{entryContext.entry_description}</Text>
                  )}
                  {(entryContext?.target_type || entryContext?.target_code) && (
                    <Text className="entry-context-target">
                      {entryContext.target_type || 'questionnaire'}
                      {entryContext.target_code ? ` · ${entryContext.target_code}` : ''}
                    </Text>
                  )}
                  {entryStatusText && (
                    <View className="entry-context-warning">
                      <Text className="entry-context-warning-text">{entryStatusText}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* 量表简介 */}
            <View className="questionnaire-intro-section">
              <Text className="section-title">量表简介</Text>
              <Text className="intro-content">
                {questionnaire?.introduction || questionnaire?.description || 
                `${questionnaire?.title || '本问卷'}是一个专业的心理测评工具，旨在帮助您了解自己在相关维度上的状况。通过完成问卷，您将获得详细的测评报告和专业的解读。`}
              </Text>
            </View>

            {/* 底部占位 */}
            <View className="bottom-placeholder" />
          </ScrollView>

          {/* 底部固定按钮 */}
          <View className="fill-ready-footer">
            <View 
              className={`start-button ${startDisabled ? 'disabled' : ''}`}
              onClick={handleStartFill}
            >
              <Text className="button-text">{entryStatusText || '开始测评'}</Text>
            </View>
          </View>
        </View>
      )}
      
      {/* 填写步骤：问卷填写页面 */}
      {currentStep === 'filling' && (
        <>
          {isSinglePage ? (
            <SinglePageQuestionnaire
              questionnaireCode={questionnaireCode}
              subSignid={subSignid}
              writedCallback={writedCallback}
              canSubmit={canSubmit}
            />
          ) : (
            <QuestionnaireForm
              questionnaireCode={questionnaireCode}
              subSignid={subSignid}
              writedCallback={writedCallback}
              canSubmit={canSubmit}
            />
          )}
        </>
      )}

      <PrivacyAuthorization />
    </>
  );
}
